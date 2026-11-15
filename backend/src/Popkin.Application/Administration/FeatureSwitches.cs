using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Administration;

public sealed record ChosenPopkinDto(Guid PopkinId, string Name, string Emoji, PopkinColour Colour);

/// <summary>
/// One panel of the Features page: the setting, how many live Popkins there are (for "On in all
/// {n} live Popkins."), the chosen Popkins, and who set it when (L2-076 AC1, AC5). It carries no
/// content of any Popkin (L2-078 AC4).
/// </summary>
public sealed record AdminFeatureDto(
    Feature Feature,
    FeatureMode Mode,
    int LivePopkins,
    IReadOnlyList<ChosenPopkinDto> Chosen,
    DateTimeOffset? ChangedAt,
    string? ChangedByName);

public sealed record AdminFeaturesDto(IReadOnlyList<AdminFeatureDto> Features);

public sealed record FeaturePopkinMatchDto(Guid PopkinId, string Name, string Emoji, PopkinColour Colour, string InviteCode, bool AlreadyOn);

/// <summary>Any admin reads the Features page (L2-076 AC1, AC12).</summary>
public sealed record GetAdminFeaturesQuery : IRequest<AdminFeaturesDto>;

public sealed class GetAdminFeaturesQueryHandler(IAppDbContext db, IAdminGuard guard) : IRequestHandler<GetAdminFeaturesQuery, AdminFeaturesDto>
{
    public async Task<AdminFeaturesDto> Handle(GetAdminFeaturesQuery request, CancellationToken cancellationToken)
    {
        await guard.CurrentAdminAsync(cancellationToken);
        var features = new List<AdminFeatureDto>();
        foreach (var feature in Enum.GetValues<Feature>())
        {
            features.Add(await FeaturePanels.OfAsync(db, feature, cancellationToken));
        }

        return new AdminFeaturesDto(features);
    }
}

/// <summary>An Owner sets who has a feature, with an optional reason (L2-076 AC2–AC4, AC11, L2-087 AC3).</summary>
public sealed record ChangeFeatureModeCommand(string Feature, string? Mode, string? Reason) : IRequest<AdminFeatureDto>;

public sealed class ChangeFeatureModeCommandHandler(IAppDbContext db, IAdminGuard guard, IAuditLog audit, IPlatformSnapshot snapshot, TimeProvider clock)
    : IRequestHandler<ChangeFeatureModeCommand, AdminFeatureDto>
{
    public async Task<AdminFeatureDto> Handle(ChangeFeatureModeCommand request, CancellationToken cancellationToken)
    {
        var feature = FeaturePanels.Parse(request.Feature);
        var me = await guard.RequireAsync(AdminAction.ChangeFeature, cancellationToken);
        var mode = FeaturePanels.ParseMode(request.Mode);
        var reason = ReasonRules.Optional(request.Reason);
        var setting = await db.FeatureSettings.FirstOrDefaultAsync(s => s.Feature == feature, cancellationToken);
        var from = setting?.Mode ?? FeatureMode.Off;
        if (from == mode)
        {
            // The setting it already has changes nothing and records nothing.
            return await FeaturePanels.OfAsync(db, feature, cancellationToken);
        }

        var now = clock.GetUtcNow();
        if (setting is null)
        {
            db.FeatureSettings.Add(FeatureSetting.Start(feature, mode, me.Id, me.Name, now));
        }
        else
        {
            setting.ChangeMode(mode, me.Id, me.Name, now);
        }

        var chosen = await FeaturePanels.ChosenAsync(db, feature, cancellationToken);
        await audit.RecordAsync(
            new AuditRecord(
                mode switch
                {
                    FeatureMode.Off => AuditAction.TurnedFeatureOff,
                    FeatureMode.Everyone => AuditAction.TurnedFeatureOnForEveryone,
                    _ => AuditAction.LimitedFeatureToChosen,
                },
                AuditTargetKind.Feature,
                feature.ToString(),
                feature.ToString(),
                reason,
                new Dictionary<string, object?>
                {
                    ["from"] = from.ToString(),
                    ["to"] = mode.ToString(),
                    ["chosen"] = chosen.Select(c => new { id = c.PopkinId, name = c.Name }).ToList(),
                }),
            cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        snapshot.Invalidate();
        return await FeaturePanels.OfAsync(db, feature, cancellationToken);
    }
}

/// <summary>An Owner adds a live Popkin to a feature's chosen Popkins (L2-076 AC6).</summary>
public sealed record AddFeaturePopkinCommand(string Feature, Guid PopkinId, string? Reason) : IRequest<AdminFeatureDto>;

public sealed class AddFeaturePopkinCommandHandler(IAppDbContext db, IAdminGuard guard, IAuditLog audit, IPlatformSnapshot snapshot, TimeProvider clock)
    : IRequestHandler<AddFeaturePopkinCommand, AdminFeatureDto>
{
    public async Task<AdminFeatureDto> Handle(AddFeaturePopkinCommand request, CancellationToken cancellationToken)
    {
        var feature = FeaturePanels.Parse(request.Feature);
        var me = await guard.RequireAsync(AdminAction.ChangeFeature, cancellationToken);
        var reason = ReasonRules.Optional(request.Reason);
        var popkin = await db.Popkins.AsNoTracking().FirstOrDefaultAsync(p => p.Id == request.PopkinId, cancellationToken)
            ?? throw MembershipGuard.NotFound();
        if (popkin.Status != PopkinStatus.Active)
        {
            throw MembershipGuard.WrappedUp();
        }

        if (await db.FeatureChosenPopkins.AnyAsync(c => c.Feature == feature && c.PopkinId == popkin.Id, cancellationToken))
        {
            throw new ProblemException(409, "feature_popkin_already_chosen", $"{popkin.Name} already has {feature}.");
        }

        db.FeatureChosenPopkins.Add(FeatureChosenPopkin.Choose(feature, popkin.Id, me.Id, clock.GetUtcNow()));
        await audit.RecordAsync(FeaturePanels.PopkinRecord(AuditAction.AddedFeaturePopkin, feature, popkin, reason), cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        snapshot.Invalidate();
        return await FeaturePanels.OfAsync(db, feature, cancellationToken);
    }
}

/// <summary>An Owner takes a Popkin off a feature's chosen Popkins; its data is kept (L2-076 AC5, L2-077 AC8).</summary>
public sealed record RemoveFeaturePopkinCommand(string Feature, Guid PopkinId) : IRequest<AdminFeatureDto>;

public sealed class RemoveFeaturePopkinCommandHandler(IAppDbContext db, IAdminGuard guard, IAuditLog audit, IPlatformSnapshot snapshot)
    : IRequestHandler<RemoveFeaturePopkinCommand, AdminFeatureDto>
{
    public async Task<AdminFeatureDto> Handle(RemoveFeaturePopkinCommand request, CancellationToken cancellationToken)
    {
        var feature = FeaturePanels.Parse(request.Feature);
        await guard.RequireAsync(AdminAction.ChangeFeature, cancellationToken);
        var chosen = await db.FeatureChosenPopkins.FirstOrDefaultAsync(c => c.Feature == feature && c.PopkinId == request.PopkinId, cancellationToken)
            ?? throw new ProblemException(404, "feature_popkin_not_chosen", $"That Popkin isn't chosen for {feature}.");
        var popkin = await db.Popkins.AsNoTracking().FirstAsync(p => p.Id == request.PopkinId, cancellationToken);
        db.FeatureChosenPopkins.Remove(chosen);
        await audit.RecordAsync(FeaturePanels.PopkinRecord(AuditAction.RemovedFeaturePopkin, feature, popkin, null), cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        snapshot.Invalidate();
        return await FeaturePanels.OfAsync(db, feature, cancellationToken);
    }
}

/// <summary>
/// The search of "Add a Popkin to {feature}": live Popkins whose name contains the text or whose
/// invite code is it, ignoring case, each marked when it already has the feature (L2-076 AC6).
/// </summary>
public sealed record SearchFeaturePopkinsQuery(string Feature, string? Text) : IRequest<IReadOnlyList<FeaturePopkinMatchDto>>;

public sealed class SearchFeaturePopkinsQueryHandler(IAppDbContext db, IAdminGuard guard)
    : IRequestHandler<SearchFeaturePopkinsQuery, IReadOnlyList<FeaturePopkinMatchDto>>
{
    /// <summary>The most matches the dialog lists; a longer list asks for a closer search.</summary>
    public const int MaxMatches = 20;

    public async Task<IReadOnlyList<FeaturePopkinMatchDto>> Handle(SearchFeaturePopkinsQuery request, CancellationToken cancellationToken)
    {
        var feature = FeaturePanels.Parse(request.Feature);
        await guard.CurrentAdminAsync(cancellationToken);
        var text = request.Text?.Trim().ToLowerInvariant();
        if (string.IsNullOrEmpty(text))
        {
            return [];
        }

        var matches = await db.Popkins.AsNoTracking()
            .Where(p => p.Status == PopkinStatus.Active && (p.Name.ToLower().Contains(text) || p.InviteCode.ToLower() == text))
            .OrderBy(p => p.Name)
            .Take(MaxMatches)
            .Select(p => new { p.Id, p.Name, p.Emoji, p.Colour, p.InviteCode })
            .ToListAsync(cancellationToken);
        var ids = matches.Select(m => m.Id).ToList();
        var on = await db.FeatureChosenPopkins.Where(c => c.Feature == feature && ids.Contains(c.PopkinId)).Select(c => c.PopkinId).ToListAsync(cancellationToken);
        return matches.Select(m => new FeaturePopkinMatchDto(m.Id, m.Name, m.Emoji, m.Colour, m.InviteCode, on.Contains(m.Id))).ToList();
    }
}

internal static class FeaturePanels
{
    public static Feature Parse(string name) =>
        Enum.GetValues<Feature>().Cast<Feature?>().FirstOrDefault(f => f.ToString() == name)
            ?? throw new ProblemException(404, "feature_not_found", "There is no such feature.");

    public static FeatureMode ParseMode(string? name) =>
        Enum.GetValues<FeatureMode>().Cast<FeatureMode?>().FirstOrDefault(m => m.ToString() == name)
            ?? throw ProblemException.Invalid("mode_not_allowed", "Choose Off, Chosen or Everyone.", "mode");

    public static async Task<IReadOnlyList<ChosenPopkinDto>> ChosenAsync(IAppDbContext db, Feature feature, CancellationToken cancellationToken)
    {
        var ids = db.FeatureChosenPopkins.Where(c => c.Feature == feature).Select(c => c.PopkinId);
        return await db.Popkins.AsNoTracking()
            .Where(p => ids.Contains(p.Id))
            .OrderBy(p => p.Name)
            .Select(p => new ChosenPopkinDto(p.Id, p.Name, p.Emoji, p.Colour))
            .ToListAsync(cancellationToken);
    }

    public static async Task<AdminFeatureDto> OfAsync(IAppDbContext db, Feature feature, CancellationToken cancellationToken)
    {
        var setting = await db.FeatureSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Feature == feature, cancellationToken);
        var live = await db.Popkins.CountAsync(p => p.Status == PopkinStatus.Active, cancellationToken);
        return new AdminFeatureDto(
            feature,
            setting?.Mode ?? FeatureMode.Off,
            live,
            await ChosenAsync(db, feature, cancellationToken),
            setting?.ChangedAt,
            setting?.ChangedByName);
    }

    public static AuditRecord PopkinRecord(AuditAction action, Feature feature, PopkinSpace popkin, string? reason) =>
        new(action, AuditTargetKind.Feature, feature.ToString(), feature.ToString(), reason,
            new Dictionary<string, object?> { ["popkin"] = new { id = popkin.Id, name = popkin.Name } });
}
