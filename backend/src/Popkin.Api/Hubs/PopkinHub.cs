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
        var connection = await sender.Send(new ConnectToHubCommand(Guid.Parse(Context.UserIdentifier!), Context.ConnectionId), Context.ConnectionAborted);
        foreach (var popkinId in connection.PopkinIds)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, GroupOf(popkinId), Context.ConnectionAborted);
        }

        await base.OnConnectedAsync();
    }
}

/// <summary>Names a connection's user by the person of its session, so one person's every tab and device is reached together.</summary>
public sealed class PersonUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection) => connection.User.FindFirstValue(ClaimTypes.NameIdentifier);
}
