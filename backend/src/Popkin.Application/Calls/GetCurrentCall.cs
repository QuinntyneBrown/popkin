using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Security;

namespace Popkin.Application.Calls;

/// <summary>
/// The Popkin's group call under way, or null: what the call banner shows (L2-029 AC2), and
/// the read that recovers `CallChanged` and `CallEnded`.
/// </summary>
public sealed record GetCurrentCallQuery(Guid PopkinId) : IRequest<CallDto?>;

public sealed class GetCurrentCallQueryHandler(IAppDbContext db, IMembershipGuard guard) : IRequestHandler<GetCurrentCallQuery, CallDto?>
{
    public async Task<CallDto?> Handle(GetCurrentCallQuery request, CancellationToken cancellationToken)
    {
        var (popkin, _) = await guard.RequireMemberAsync(request.PopkinId, cancellationToken);
        var call = await db.Calls.AsNoTracking().FirstOrDefaultAsync(c => c.PopkinId == popkin.Id && c.EndedAt == null, cancellationToken);
        return call is null ? null : CallDto.Of(call, await CallReads.CountOnAsync(db, call.Id, cancellationToken));
    }
}
