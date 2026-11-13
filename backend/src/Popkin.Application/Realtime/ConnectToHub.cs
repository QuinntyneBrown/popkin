using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;

namespace Popkin.Application.Realtime;

/// <summary>The Popkins whose events a new connection receives.</summary>
public sealed record HubConnectionDto(IReadOnlyList<Guid> PopkinIds);

/// <summary>
/// A person opened a connection to the hub. The person comes from the connection's session,
/// never from what the client says. The answer is every Popkin they are a member of: membership
/// alone decides whose events a connection receives (L2-051).
/// </summary>
public sealed record ConnectToHubCommand(Guid PersonId, string ConnectionId) : IRequest<HubConnectionDto>;

public sealed class ConnectToHubCommandHandler(IAppDbContext db) : IRequestHandler<ConnectToHubCommand, HubConnectionDto>
{
    public async Task<HubConnectionDto> Handle(ConnectToHubCommand request, CancellationToken cancellationToken)
    {
        var popkinIds = await db.Memberships.AsNoTracking()
            .Where(m => m.PersonId == request.PersonId && m.LeftAt == null)
            .Select(m => m.PopkinId)
            .ToListAsync(cancellationToken);
        return new HubConnectionDto(popkinIds);
    }
}
