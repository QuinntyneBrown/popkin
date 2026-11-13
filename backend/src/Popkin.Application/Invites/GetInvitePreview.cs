using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Invites;

public enum InviteState
{
    Open,
    WrappedUp,
}

public sealed record InviterDto(string FirstName, AvatarDto Avatar);

/// <summary>Whether the caller already belongs. `PopkinId` is filled only for a member.</summary>
public sealed record InviteViewerDto(bool IsMember, Guid? PopkinId);

/// <summary>
/// The only part of a Popkin someone who is not a member can see: exactly what the invite screen
/// shows and nothing from inside the Popkin (L2-012 AC5, L2-051 AC5).
/// </summary>
public sealed record InvitePreviewDto(
    InviteState State,
    string Name,
    string Emoji,
    PopkinColour Colour,
    int MemberCount,
    DateTimeOffset? EndsAt,
    DateTimeOffset? WrappedUpAt,
    IReadOnlyList<AvatarDto> Avatars,
    InviterDto Inviter,
    InviteViewerDto Viewer);

/// <summary>The preview behind an invite code, for anyone who holds it (L2-012, L2-016).</summary>
public sealed record GetInvitePreviewQuery(string Code) : IRequest<InvitePreviewDto>;

public sealed class GetInvitePreviewQueryHandler(IAppDbContext db, ICurrentPerson current)
    : IRequestHandler<GetInvitePreviewQuery, InvitePreviewDto>
{
    public const int MaxAvatars = 5;

    public async Task<InvitePreviewDto> Handle(GetInvitePreviewQuery request, CancellationToken cancellationToken)
    {
        var popkin = await db.Popkins.AsNoTracking().FirstOrDefaultAsync(p => p.InviteCode == request.Code, cancellationToken)
            ?? throw InviteProblems.NotFound();
        var members = await InviteMembers.OfAsync(db, popkin, cancellationToken);
        // The link does not say which member shared it, so the preview names the Host.
        var host = members[0];
        var isMember = current.FindPersonId() is { } personId && members.Any(m => m.PersonId == personId);

        return new InvitePreviewDto(
            popkin.Status == PopkinStatus.WrappedUp ? InviteState.WrappedUp : InviteState.Open,
            popkin.Name,
            popkin.Emoji,
            popkin.Colour,
            members.Count,
            popkin.EndsAt,
            popkin.WrappedUpAt,
            members.Take(MaxAvatars).Select(AvatarDto.Of).ToList(),
            new InviterDto(PersonName.FirstName(host.DisplayName), AvatarDto.Of(host)),
            new InviteViewerDto(isMember, isMember ? popkin.Id : null));
    }
}

public static class InviteProblems
{
    public static ProblemException NotFound() => new(404, "invite_not_found", "We can't find that invite.");

    public static ProblemException WrappedUp() => new(409, "popkin_wrapped_up", "This Popkin has wrapped up.");
}

public static class InviteMembers
{
    /// <summary>The Popkin's members who have not left: the Host first, then in the order they joined.</summary>
    public static async Task<List<Membership>> OfAsync(IAppDbContext db, PopkinSpace popkin, CancellationToken cancellationToken)
    {
        var members = await db.Memberships.AsNoTracking()
            .Where(m => m.PopkinId == popkin.Id && m.LeftAt == null)
            .ToListAsync(cancellationToken);
        return members
            .OrderByDescending(m => m.Role == MembershipRole.Host)
            .ThenBy(m => m.JoinedAt)
            .ThenBy(m => m.Id)
            .ToList();
    }
}
