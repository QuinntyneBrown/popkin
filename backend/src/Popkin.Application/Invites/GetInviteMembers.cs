using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;

namespace Popkin.Application.Invites;

/// <summary>A member as the people about to join see them: the name they go by and their avatar (L2-054 AC2).</summary>
public sealed record InviteMemberDto(string DisplayName, AvatarDto Avatar);

public sealed record InviteMembersDto(IReadOnlyList<InviteMemberDto> Members, int OthersCount);

/// <summary>
/// Who is already in, for the profile step of joining (L2-058 AC10). It needs a session: the
/// invite preview, which is open to visitors, carries no member name (L2-012 AC5).
/// </summary>
public sealed record GetInviteMembersQuery(string Code) : IRequest<InviteMembersDto>;

public sealed class GetInviteMembersQueryHandler(IAppDbContext db) : IRequestHandler<GetInviteMembersQuery, InviteMembersDto>
{
    public const int MaxMembers = 8;

    public async Task<InviteMembersDto> Handle(GetInviteMembersQuery request, CancellationToken cancellationToken)
    {
        var popkin = await db.Popkins.AsNoTracking().FirstOrDefaultAsync(p => p.InviteCode == request.Code, cancellationToken)
            ?? throw InviteProblems.NotFound();
        if (popkin.Status == Domain.PopkinStatus.WrappedUp)
        {
            throw InviteProblems.WrappedUp();
        }

        var members = await InviteMembers.OfAsync(db, popkin, cancellationToken);
        var shown = members.Take(MaxMembers).Select(m => new InviteMemberDto(m.DisplayName, AvatarDto.Of(m))).ToList();
        return new InviteMembersDto(shown, members.Count - shown.Count);
    }
}
