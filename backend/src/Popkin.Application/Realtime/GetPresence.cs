using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Invites;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Realtime;

/// <summary>A member who is here now, as the other members see them.</summary>
public sealed record PresenceMemberDto(Guid MembershipId, string DisplayName, AvatarDto Avatar);

/// <summary>
/// Who is here now: the count, the version it was reached at, and the first members by name.
/// `HereNow` counts everyone, also those `Members` leaves out.
/// </summary>
public sealed record PresenceDto(long Version, int HereNow, IReadOnlyList<PresenceMemberDto> Members);

/// <summary>
/// Who has the Popkin open at this moment, for any of its members. It is the recovery read of
/// `PresenceChanged`, which carries the count only.
/// </summary>
public sealed record GetPresenceQuery(Guid PopkinId) : IRequest<PresenceDto>;

public sealed class GetPresenceQueryHandler(IAppDbContext db, IMembershipGuard guard, PresenceTracker presence, IPhotoStore photos)
    : IRequestHandler<GetPresenceQuery, PresenceDto>
{
    public const int MaxMembers = 8;

    public async Task<PresenceDto> Handle(GetPresenceQuery request, CancellationToken cancellationToken)
    {
        var (popkin, _) = await guard.RequireMemberAsync(request.PopkinId, cancellationToken);
        var now = presence.Get(popkin.Id);
        var here = presence.PeopleHere(popkin.Id);
        var members = await db.Memberships.AsNoTracking()
            .Where(m => m.PopkinId == popkin.Id && m.LeftAt == null && here.Contains(m.PersonId))
            .ToListAsync(cancellationToken);
        // The Host first, then in the order they joined.
        var named = members
            .OrderByDescending(m => m.Role == MembershipRole.Host)
            .ThenBy(m => m.JoinedAt)
            .ThenBy(m => m.Id)
            .Take(MaxMembers)
            .Select(m => new PresenceMemberDto(m.Id, m.DisplayName, AvatarDto.Of(m, photos)))
            .ToList();
        return new PresenceDto(now.Version, now.HereNow, named);
    }
}
