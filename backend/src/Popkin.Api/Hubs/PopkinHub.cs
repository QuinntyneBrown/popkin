using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Popkin.Application.Abstractions;
using Popkin.Application.Realtime;

namespace Popkin.Api.Hubs;

/// <summary>
/// The one real-time connection of a signed-in browser tab, at `/hubs/popkin`. It needs a
/// session (L2-050 AC4) and is a transport only: what it must decide it asks of a MediatR
/// request, as a controller does. Clients call no chat method on it; they are sent the events
/// of <see cref="IPopkinClient"/>.
/// </summary>
[Authorize]
public sealed class PopkinHub(ISender sender) : Hub<IPopkinClient>
{
    public const string Path = "/hubs/popkin";

    /// <summary>The group every connection of a Popkin's members is in.</summary>
    public static string GroupOf(Guid popkinId) => $"popkin:{popkinId}";

    public override async Task OnConnectedAsync()
    {
        await sender.Send(new ConnectToHubCommand(Guid.Parse(Context.UserIdentifier!), Context.ConnectionId), Context.ConnectionAborted);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        // The connection has gone, so its token is cancelled: the release must not be.
        await sender.Send(new DisconnectFromHubCommand(Context.ConnectionId), CancellationToken.None);
        await base.OnDisconnectedAsync(exception);
    }
}

/// <summary>Names a connection's user by the person of its session, so one person's every tab and device is reached together.</summary>
public sealed class PersonUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection) => connection.User.FindFirstValue(ClaimTypes.NameIdentifier);
}

/// <summary>Carries out, with the hub's groups, which connections are sent a Popkin's events.</summary>
public sealed class HubPopkinConnections(IHubContext<PopkinHub, IPopkinClient> hub) : IPopkinConnections
{
    public Task AddToPopkinAsync(string connectionId, Guid popkinId, CancellationToken cancellationToken) =>
        hub.Groups.AddToGroupAsync(connectionId, PopkinHub.GroupOf(popkinId), cancellationToken);
}
