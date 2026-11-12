using MediatR;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Popkins;

public sealed record InviteDto(string Code, string Url, string PopkinName, string Emoji, PopkinColour Colour);

/// <summary>A Popkin's invite, for any member of an active Popkin (L2-011 AC1).</summary>
public sealed record GetInviteQuery(Guid PopkinId) : IRequest<InviteDto>;

public sealed class GetInviteQueryHandler(IMembershipGuard guard, InviteLinkBuilder links) : IRequestHandler<GetInviteQuery, InviteDto>
{
    public async Task<InviteDto> Handle(GetInviteQuery request, CancellationToken cancellationToken)
    {
        var (popkin, _) = await guard.RequireActiveMemberAsync(request.PopkinId, cancellationToken);
        return new InviteDto(popkin.InviteCode, links.Build(popkin.InviteCode), popkin.Name, popkin.Emoji, popkin.Colour);
    }
}
