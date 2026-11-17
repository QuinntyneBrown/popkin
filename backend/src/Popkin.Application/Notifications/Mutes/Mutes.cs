using System.Globalization;
using System.Text;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Invites;
using Popkin.Application.Problems;
using Popkin.Application.Telemetry;
using Popkin.Domain;

namespace Popkin.Application.Notifications.Mutes;

/// <summary>A person the caller has muted, named as in their most recent shared membership (L2-160 AC1).</summary>
public sealed record MutedPersonDto(Guid MuteId, string Name, AvatarDto Avatar, IReadOnlyList<string> SharedPopkins);

/// <summary>Someone the caller could mute: they share an active Popkin (L2-160 AC2).</summary>
public sealed record MuteCandidateDto(Guid MembershipId, string Name, AvatarDto Avatar, IReadOnlyList<string> SharedPopkins);

/// <summary>
/// The people a person shares active Popkins with (mute-people, "SharedPopkins"): memberships that
/// have not left, in Popkins that have not wrapped up.
/// </summary>
public static class SharedPopkins
{
    /// <summary>Every other member's live membership in the person's active Popkins, with the Popkin's name.</summary>
    public static async Task<List<(Membership Membership, string Popkin)>> OthersOfAsync(
        IAppDbContext db, Guid personId, CancellationToken cancellationToken)
    {
        var mine = db.Memberships.Where(m => m.PersonId == personId && m.LeftAt == null).Select(m => m.PopkinId);
        var rows = await db.Memberships.AsNoTracking()
            .Where(m => mine.Contains(m.PopkinId) && m.PersonId != personId && m.LeftAt == null)
            .Join(db.Popkins.Where(p => p.Status != PopkinStatus.WrappedUp), m => m.PopkinId, p => p.Id, (m, p) => new { Membership = m, p.Name })
            .ToListAsync(cancellationToken);
        return rows.Select(r => (r.Membership, r.Name)).ToList();
    }

    /// <summary>One person per group: the most recent membership names them, and every shared Popkin is listed.</summary>
    public static IEnumerable<(Membership Latest, IReadOnlyList<string> Popkins)> ByPerson(IEnumerable<(Membership Membership, string Popkin)> rows) =>
        rows.GroupBy(r => r.Membership.PersonId)
            .Select(g => (
                g.OrderByDescending(r => r.Membership.JoinedAt).First().Membership,
                (IReadOnlyList<string>)g.Select(r => r.Popkin).Distinct().Order(StringComparer.CurrentCulture).ToList()));

    /// <summary>A name folded for search: lower case, accents removed.</summary>
    public static string Fold(string text)
    {
        var decomposed = text.Normalize(NormalizationForm.FormD);
        var kept = decomposed.Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark);
        return new string(kept.ToArray()).Normalize(NormalizationForm.FormC).ToLowerInvariant();
    }
}

/// <summary>The caller's mutes, newest first (L2-160 AC1).</summary>
public static class MutedPeople
{
    public static async Task<IReadOnlyList<MutedPersonDto>> OfAsync(
        IAppDbContext db, IPhotoStore photos, Guid personId, CancellationToken cancellationToken)
    {
        var mutes = await db.PersonMutes.AsNoTracking()
            .Where(m => m.PersonId == personId)
            .OrderByDescending(m => m.CreatedAt)
            .ToListAsync(cancellationToken);
        if (mutes.Count == 0)
        {
            return [];
        }

        var shared = SharedPopkins.ByPerson(await SharedPopkins.OthersOfAsync(db, personId, cancellationToken))
            .ToDictionary(x => x.Latest.PersonId);
        var mutedIds = mutes.Select(m => m.MutedPersonId).ToList();
        // Someone who shares no active Popkin now is named by their latest membership anywhere.
        var latest = (await db.Memberships.AsNoTracking().Where(m => mutedIds.Contains(m.PersonId)).ToListAsync(cancellationToken))
            .GroupBy(m => m.PersonId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(m => m.JoinedAt).First());
        return mutes
            .Where(m => latest.ContainsKey(m.MutedPersonId))
            .Select(m =>
            {
                var membership = shared.TryGetValue(m.MutedPersonId, out var s) ? s.Latest : latest[m.MutedPersonId];
                return new MutedPersonDto(
                    m.Id, membership.DisplayName, AvatarDto.Of(membership, photos), shared.TryGetValue(m.MutedPersonId, out var p) ? p.Popkins : []);
            })
            .ToList();
    }
}

public sealed record SearchMuteCandidatesQuery(string? Q) : IRequest<IReadOnlyList<MuteCandidateDto>>;

public sealed class SearchMuteCandidatesQueryHandler(IAppDbContext db, ICurrentPerson current, IPhotoStore photos)
    : IRequestHandler<SearchMuteCandidatesQuery, IReadOnlyList<MuteCandidateDto>>
{
    private const int Most = 5;

    public const int MaxQuery = 40;

    public async Task<IReadOnlyList<MuteCandidateDto>> Handle(SearchMuteCandidatesQuery request, CancellationToken cancellationToken)
    {
        var q = request.Q?.Trim() ?? "";
        if (q.Length > MaxQuery)
        {
            throw new ProblemException(400, "invalid_query", "Search with 40 characters at most.");
        }

        var personId = current.PersonId;
        var muted = await db.PersonMutes.Where(m => m.PersonId == personId).Select(m => m.MutedPersonId).ToListAsync(cancellationToken);
        var folded = SharedPopkins.Fold(q);
        return SharedPopkins.ByPerson(await SharedPopkins.OthersOfAsync(db, personId, cancellationToken))
            .Where(x => !muted.Contains(x.Latest.PersonId) && SharedPopkins.Fold(x.Latest.DisplayName).Contains(folded, StringComparison.Ordinal))
            .OrderBy(x => x.Latest.DisplayName, StringComparer.CurrentCulture)
            .Take(Most)
            .Select(x => new MuteCandidateDto(x.Latest.Id, x.Latest.DisplayName, AvatarDto.Of(x.Latest, photos), x.Popkins))
            .ToList();
    }
}

/// <summary>Mutes the person behind a membership the caller shares an active Popkin with (L2-160 AC1, AC7).</summary>
public sealed record MutePersonCommand(Guid MembershipId) : IRequest<MutedPersonDto>;

public sealed class MutePersonCommandHandler(IAppDbContext db, ICurrentPerson current, IPhotoStore photos, TimeProvider clock, PopkinMetrics metrics)
    : IRequestHandler<MutePersonCommand, MutedPersonDto>
{
    public async Task<MutedPersonDto> Handle(MutePersonCommand request, CancellationToken cancellationToken)
    {
        var personId = current.PersonId;
        var shared = await SharedPopkins.OthersOfAsync(db, personId, cancellationToken);
        var target = shared.Select(s => s.Membership).FirstOrDefault(m => m.Id == request.MembershipId)
            ?? throw new ProblemException(404, "person_not_found", "This person isn't in a Popkin with you.");
        var mute = await db.PersonMutes.FirstOrDefaultAsync(m => m.PersonId == personId && m.MutedPersonId == target.PersonId, cancellationToken);
        if (mute is null)
        {
            mute = PersonMute.Create(personId, target.PersonId, clock.GetUtcNow());
            db.PersonMutes.Add(mute);
            await db.SaveChangesAsync(cancellationToken);
            metrics.PersonMuted("mute");
        }

        var person = SharedPopkins.ByPerson(shared).Single(x => x.Latest.PersonId == target.PersonId);
        return new MutedPersonDto(mute.Id, person.Latest.DisplayName, AvatarDto.Of(person.Latest, photos), person.Popkins);
    }
}

/// <summary>Removes one of the caller's own mutes (L2-160 AC5).</summary>
public sealed record UnmutePersonCommand(Guid MuteId) : IRequest;

public sealed class UnmutePersonCommandHandler(IAppDbContext db, ICurrentPerson current, PopkinMetrics metrics)
    : IRequestHandler<UnmutePersonCommand>
{
    public async Task Handle(UnmutePersonCommand request, CancellationToken cancellationToken)
    {
        var mute = await db.PersonMutes.FirstOrDefaultAsync(m => m.Id == request.MuteId && m.PersonId == current.PersonId, cancellationToken)
            ?? throw new ProblemException(404, "mute_not_found", "This mute isn't here.");
        db.PersonMutes.Remove(mute);
        await db.SaveChangesAsync(cancellationToken);
        metrics.PersonMuted("unmute");
    }
}
