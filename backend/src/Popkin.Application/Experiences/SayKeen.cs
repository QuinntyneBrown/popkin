using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Invites;
using Popkin.Application.Problems;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Experiences;

/// <summary>A member who is keen: a first name and an avatar, never a contact detail (L2-054 AC2).</summary>
public sealed record KeenMemberDto(Guid MembershipId, string FirstName, AvatarDto Avatar)
{
    public static KeenMemberDto Of(Membership member, IPhotoStore store) =>
        new(member.Id, PersonName.FirstName(member.DisplayName), AvatarDto.Of(member, store));
}

/// <summary>
/// Who is keen on something the group wants to do (L2-042 AC1): how many, whether the reader is,
/// and the first four who said so, the earliest first.
/// </summary>
public sealed record KeenDto(int Count, bool Mine, IReadOnlyList<KeenMemberDto> Members);

/// <summary>
/// Says the caller is keen on something the group wants to do, or takes it back (L2-042 AC2,
/// AC3). Repeating either has the same effect.
/// </summary>
public sealed record SetKeenCommand(Guid PopkinId, Guid ExperienceId, bool Keen) : IRequest<KeenDto>;

public sealed class SetKeenCommandHandler(IAppDbContext db, IMembershipGuard guard, IPhotoStore store, TimeProvider clock)
    : IRequestHandler<SetKeenCommand, KeenDto>
{
    public async Task<KeenDto> Handle(SetKeenCommand request, CancellationToken cancellationToken)
    {
        // Nothing new is added to a Popkin that has wrapped up (L2-045 AC2).
        var (popkin, membership) = await guard.RequireActiveMemberAsync(request.PopkinId, cancellationToken);
        var experience = await Experiences.RequireAsync(db.Experiences.AsNoTracking(), popkin.Id, request.ExperienceId, cancellationToken);
        if (!experience.IsWanted)
        {
            throw NotWanted();
        }

        var mine = await db.ExperienceKeens
            .FirstOrDefaultAsync(k => k.ExperienceId == experience.Id && k.MembershipId == membership.Id, cancellationToken);
        if (request.Keen && mine is null)
        {
            var keen = experience.AddKeen(membership.Id, clock.GetUtcNow());
            db.ExperienceKeens.Add(keen);
            try
            {
                await db.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException)
            {
                // Two requests of one member raced and the other saved first: they are keen, as asked.
                db.ExperienceKeens.Remove(keen);
            }
        }
        else if (!request.Keen && mine is not null)
        {
            db.ExperienceKeens.Remove(mine);
            await db.SaveChangesAsync(cancellationToken);
        }

        return await KeenOf.OneAsync(db, store, experience, membership, cancellationToken);
    }

    public static ProblemException NotWanted() =>
        new(409, "experience_not_wanted", "Only something the group wants to do can be keen on.");
}

/// <summary>Reads who is keen on experiences.</summary>
public static class KeenOf
{
    /// <summary>How many are keen on each experience given; the database counts them.</summary>
    public static async Task<Func<Experience, int>> CountsAsync(IAppDbContext db, IEnumerable<Experience> experiences, CancellationToken cancellationToken)
    {
        var ids = experiences.Where(e => e.IsWanted).Select(e => e.Id).ToList();
        var counts = await db.ExperienceKeens.AsNoTracking()
            .Where(k => ids.Contains(k.ExperienceId))
            .GroupBy(k => k.ExperienceId)
            .Select(g => new { ExperienceId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(c => c.ExperienceId, c => c.Count, cancellationToken);
        // Something the group did shows no keen, whatever it took while it was an idea.
        return experience => experience.IsWanted ? counts.GetValueOrDefault(experience.Id) : 0;
    }

    /// <summary>Who is keen on one idea, as the reader sees it; null for anything else.</summary>
    public static async Task<KeenDto?> OfAsync(IAppDbContext db, IPhotoStore store, Experience experience, Membership reader, CancellationToken cancellationToken) =>
        experience.IsWanted ? await OneAsync(db, store, experience, reader, cancellationToken) : null;

    internal static async Task<KeenDto> OneAsync(IAppDbContext db, IPhotoStore store, Experience experience, Membership reader, CancellationToken cancellationToken)
    {
        var keen = db.ExperienceKeens.AsNoTracking().Where(k => k.ExperienceId == experience.Id);
        var count = await keen.CountAsync(cancellationToken);
        var mine = await keen.AnyAsync(k => k.MembershipId == reader.Id, cancellationToken);
        var firstIds = await keen.OrderBy(k => k.At).ThenBy(k => k.MembershipId).Take(4).Select(k => k.MembershipId).ToListAsync(cancellationToken);
        var members = await db.Memberships.AsNoTracking().Where(m => firstIds.Contains(m.Id)).ToDictionaryAsync(m => m.Id, cancellationToken);
        return new KeenDto(count, mine, [.. firstIds.Select(id => KeenMemberDto.Of(members[id], store))]);
    }
}
