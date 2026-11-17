using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Administration;

/// <summary>One row of Limits: its value, its default and bounds, its unit and its last change (L2-117 AC1, L2-176 AC3).</summary>
public sealed record AdminLimitDto(
    LimitKey Limit,
    int Value,
    int DefaultValue,
    int? MaxValue,
    string Unit,
    DateTimeOffset? ChangedAt,
    string? ChangedByName);

/// <summary>
/// The panels of Limits. The upload sizes and rate limits are empty until their slices are built
/// (docs/detailed-designs/admin-platform/limits, Build order).
/// </summary>
public sealed record AdminLimitsDto(
    IReadOnlyList<AdminLimitDto> Uploads,
    IReadOnlyList<AdminLimitDto> Rates,
    IReadOnlyList<AdminLimitDto> Sessions);

/// <summary>Any admin reads Limits (L2-117 AC1, L2-176 AC3).</summary>
public sealed record GetAdminLimitsQuery : IRequest<AdminLimitsDto>;

public sealed class GetAdminLimitsQueryHandler(IAppDbContext db, IAdminGuard guard) : IRequestHandler<GetAdminLimitsQuery, AdminLimitsDto>
{
    public async Task<AdminLimitsDto> Handle(GetAdminLimitsQuery request, CancellationToken cancellationToken)
    {
        await guard.CurrentAdminAsync(cancellationToken);
        return await LimitRows.ReadAsync(db, cancellationToken);
    }
}

public sealed record LimitChange(string? Limit, int Value);

/// <summary>
/// An Owner saves new limits with a reason; each changed limit is one audit entry, all in one save,
/// and every request honours them within a minute (L2-117 AC5, AC6, AC8, L2-176 AC4–AC8).
/// </summary>
public sealed record ChangeLimitsCommand(IReadOnlyList<LimitChange>? Changes, string? Reason) : IRequest<AdminLimitsDto>;

public sealed class ChangeLimitsCommandHandler(IAppDbContext db, IAdminGuard guard, IAuditLog audit, IPlatformSnapshot snapshot, TimeProvider clock)
    : IRequestHandler<ChangeLimitsCommand, AdminLimitsDto>
{
    public async Task<AdminLimitsDto> Handle(ChangeLimitsCommand request, CancellationToken cancellationToken)
    {
        var me = await guard.RequireAsync(AdminAction.ChangeLimits, cancellationToken);
        var reason = ReasonRules.Required(request.Reason);
        var changes = LimitRows.Parse(request.Changes ?? []);
        var saved = await db.LimitSettings.ToDictionaryAsync(s => s.Limit, cancellationToken);
        var now = clock.GetUtcNow();
        var changed = 0;
        foreach (var (limit, value) in changes)
        {
            var old = saved.TryGetValue(limit, out var setting) ? setting.Value : LimitDefaults.Of(limit);
            if (old == value)
            {
                // The value it already has changes nothing and records nothing.
                continue;
            }

            if (setting is null)
            {
                db.LimitSettings.Add(LimitSetting.Start(limit, value, me.Id, me.Name, now));
            }
            else
            {
                setting.Change(value, me.Id, me.Name, now);
            }

            await audit.RecordAsync(
                new AuditRecord(AuditAction.ChangedLimits, AuditTargetKind.Limit, limit.ToString(), LimitRows.Name(limit), reason,
                    new Dictionary<string, object?> { ["old"] = old, ["new"] = value, ["unit"] = LimitRows.Unit(limit) }),
                cancellationToken);
            changed++;
        }

        if (changed == 0)
        {
            throw ProblemException.Invalid("no_change", "Nothing has changed.", "changes");
        }

        await db.SaveChangesAsync(cancellationToken);
        snapshot.Invalidate();
        return await LimitRows.ReadAsync(db, cancellationToken);
    }
}

internal static class LimitRows
{
    public static string Name(LimitKey limit) => limit switch
    {
        LimitKey.SessionDays => "Sign-in lasts",
        _ => limit.ToString(),
    };

    public static string Unit(LimitKey limit) => limit switch
    {
        LimitKey.SessionDays => "days",
        _ => "",
    };

    public static async Task<AdminLimitsDto> ReadAsync(IAppDbContext db, CancellationToken cancellationToken)
    {
        var saved = await db.LimitSettings.AsNoTracking().ToDictionaryAsync(s => s.Limit, cancellationToken);
        AdminLimitDto Row(LimitKey limit)
        {
            saved.TryGetValue(limit, out var s);
            return new AdminLimitDto(limit, s?.Value ?? LimitDefaults.Of(limit), LimitDefaults.Of(limit), LimitDefaults.MaximumOf(limit), Unit(limit), s?.ChangedAt, s?.ChangedByName);
        }

        return new AdminLimitsDto([], [], [Row(LimitKey.SessionDays)]);
    }

    /// <summary>Each change as a known limit and an allowed value, refusing the first that is not (L2-176 AC4).</summary>
    public static IReadOnlyList<(LimitKey Limit, int Value)> Parse(IReadOnlyList<LimitChange> changes)
    {
        var parsed = new List<(LimitKey, int)>();
        for (var i = 0; i < changes.Count; i++)
        {
            var change = changes[i];
            if (!Enum.TryParse<LimitKey>(change.Limit, out var limit) || !Enum.IsDefined(limit) || int.TryParse(change.Limit, out _))
            {
                throw ProblemException.Invalid("limit_unknown", "There is no such limit.", $"changes[{i}].limit");
            }

            if (!LimitDefaults.Allows(limit, change.Value))
            {
                throw ProblemException.Invalid(
                    "limit_not_allowed",
                    LimitDefaults.MaximumOf(limit) is { } max
                        ? $"Enter a whole number from {LimitDefaults.Minimum} to {max}."
                        : $"Enter a whole number of {LimitDefaults.Minimum} or more.",
                    $"changes[{i}].value");
            }

            parsed.Add((limit, change.Value));
        }

        return parsed;
    }
}
