using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Security;

namespace Popkin.Application.Calls;

/// <summary>
/// The Popkin's group call under way, or with a thread the direct call of that direct message,
/// or null: what the call banner shows (L2-029 AC2), and the read that recovers `CallChanged`
/// and `CallEnded`. Only the two members of a direct message read its call (L2-023 AC2).
/// </summary>
public sealed record GetCurrentCallQuery(Guid PopkinId, Guid? ThreadId = null) : IRequest<CallDto?>;

public sealed class GetCurrentCallQueryHandler(IAppDbContext db, IMembershipGuard guard) : IRequestHandler<GetCurrentCallQuery, CallDto?>
{
    public async Task<CallDto?> Handle(GetCurrentCallQuery request, CancellationToken cancellationToken)
    {
        var (popkin, membership) = await guard.RequireMemberAsync(request.PopkinId, cancellationToken);
        var threadId = await CallReads.CallThreadIdAsync(db, membership, request.ThreadId, cancellationToken);
        var call = await db.Calls.AsNoTracking()
            .FirstOrDefaultAsync(c => c.PopkinId == popkin.Id && c.ThreadId == threadId && c.EndedAt == null, cancellationToken);
        return call is null ? null : CallDto.Of(call, await CallReads.CountOnAsync(db, call.Id, cancellationToken));
    }
}
