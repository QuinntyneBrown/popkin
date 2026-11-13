using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Security;

namespace Popkin.Application.WrapUp;

/// <summary>
/// What the wrap-up screen tells the Host: how many members the wrap-up affects, and the photos
/// and messages the recap everyone gets will count (L2-043 AC1).
/// </summary>
public sealed record WrapUpPreviewDto(int MemberCount, int PhotoCount, int MessageCount);

/// <summary>For the Host of an active Popkin only (L2-043 AC6, L2-051 AC4).</summary>
public sealed record GetWrapUpPreviewQuery(Guid PopkinId) : IRequest<WrapUpPreviewDto>;

public sealed class GetWrapUpPreviewQueryHandler(IAppDbContext db, IMembershipGuard guard)
    : IRequestHandler<GetWrapUpPreviewQuery, WrapUpPreviewDto>
{
    public async Task<WrapUpPreviewDto> Handle(GetWrapUpPreviewQuery request, CancellationToken cancellationToken)
    {
        var (popkin, _) = await guard.RequireHostAsync(request.PopkinId, cancellationToken);
        // As the header of the Popkin home counts them: the members who have not left.
        var members = await db.Memberships.AsNoTracking().CountAsync(m => m.PopkinId == popkin.Id && m.LeftAt == null, cancellationToken);
        return new WrapUpPreviewDto(
            members,
            await RecapCounts.PhotosAsync(db, popkin, cancellationToken),
            await RecapCounts.MessagesAsync(db, popkin.Id, cancellationToken));
    }
}
