using MediatR;
using Popkin.Application.Abstractions;
using Popkin.Application.Invites;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Members;

/// <summary>
/// A member as the other members see them: the name they go by, their avatar and their role,
/// never a phone number or an email (L2-054 AC2). `IsViewer` marks the member reading.
/// </summary>
public sealed record MemberDto(Guid MembershipId, string DisplayName, AvatarDto Avatar, MembershipRole Role, bool IsViewer);

/// <summary>A Popkin's members who have not left, for any of them: the Host first, then in the order they joined (L2-019 AC6).</summary>
public sealed record GetMembersQuery(Guid PopkinId) : IRequest<IReadOnlyList<MemberDto>>;

public sealed class GetMembersQueryHandler(IAppDbContext db, IMembershipGuard guard, IPhotoStore photos)
    : IRequestHandler<GetMembersQuery, IReadOnlyList<MemberDto>>
{
    public async Task<IReadOnlyList<MemberDto>> Handle(GetMembersQuery request, CancellationToken cancellationToken)
    {
        var (popkin, membership) = await guard.RequireMemberAsync(request.PopkinId, cancellationToken);
        var members = await InviteMembers.OfAsync(db, popkin, cancellationToken);
        return members
            .Select(m => new MemberDto(m.Id, m.DisplayName, AvatarDto.Of(m, photos), m.Role, m.Id == membership.Id))
            .ToList();
    }
}
