using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Popkin.Application.Abstractions;
using Popkin.Application.Calls;
using Popkin.Application.Realtime;

namespace Popkin.Api.Hubs;

/// <summary>
/// The one real-time connection of a signed-in browser tab, at `/hubs/popkin`. It needs a
/// session (L2-050 AC4) and is a transport only: what it must decide it asks of a MediatR
/// request, as a controller does. Clients call no chat method on it; they are sent the events
/// of <see cref="IPopkinClient"/>. The methods a client calls are those of a call, and a
/// refused one fails with the `code` the same refusal has over HTTP (<see cref="ProblemHubFilter"/>).
/// </summary>
[Authorize]
public sealed class PopkinHub(ISender sender) : Hub<IPopkinClient>
{
    public const string Path = "/hubs/popkin";

    /// <summary>The group every connection of a Popkin's members is in.</summary>
    public static string GroupOf(Guid popkinId) => $"popkin:{popkinId}";

    /// <summary>The group of the connections on a call.</summary>
    public static string CallGroupOf(Guid callId) => $"call:{callId}";

    private Guid PersonId => Guid.Parse(Context.UserIdentifier!);

    public override async Task OnConnectedAsync()
    {
        await sender.Send(new ConnectToHubCommand(PersonId, Context.ConnectionId), Context.ConnectionAborted);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        // The connection has gone, so its token is cancelled: the release must not be.
        await sender.Send(new DisconnectFromHubCommand(Context.ConnectionId), CancellationToken.None);
        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// This connection is the one the caller is on that call with: it is sent the call's
    /// events and the signals meant for them. Invoked, because the caller needs the outcome.
    /// </summary>
    public Task JoinCall(Guid callId) =>
        sender.Send(new JoinCallGroupCommand(PersonId, callId, Context.ConnectionId), Context.ConnectionAborted);

    /// <summary>
    /// Relays the caller's offer, answer or candidate to one other participant of the call. It
    /// arrives or the call fails; the hub never reads the payload.
    /// </summary>
    public Task SendSignal(Guid callId, Guid toMembershipId, CallSignalDto? signal) =>
        sender.Send(new RelaySignalCommand(PersonId, callId, toMembershipId, signal), Context.ConnectionAborted);
}

/// <summary>Names a connection's user by the person of its session, so one person's every tab and device is reached together.</summary>
public sealed class PersonUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection) => connection.User.FindFirstValue(ClaimTypes.NameIdentifier);
}

/// <summary>Carries out, with the hub's groups, which connections are sent a Popkin's events and a call's.</summary>
public sealed class HubPopkinConnections(IHubContext<PopkinHub, IPopkinClient> hub) : IPopkinConnections
{
    public Task AddToPopkinAsync(string connectionId, Guid popkinId, CancellationToken cancellationToken) =>
        hub.Groups.AddToGroupAsync(connectionId, PopkinHub.GroupOf(popkinId), cancellationToken);

    public Task RemoveFromPopkinAsync(string connectionId, Guid popkinId, CancellationToken cancellationToken) =>
        hub.Groups.RemoveFromGroupAsync(connectionId, PopkinHub.GroupOf(popkinId), cancellationToken);

    public Task AddToCallAsync(string connectionId, Guid callId, CancellationToken cancellationToken) =>
        hub.Groups.AddToGroupAsync(connectionId, PopkinHub.CallGroupOf(callId), cancellationToken);

    public Task RemoveFromCallAsync(string connectionId, Guid callId, CancellationToken cancellationToken) =>
        hub.Groups.RemoveFromGroupAsync(connectionId, PopkinHub.CallGroupOf(callId), cancellationToken);
}
