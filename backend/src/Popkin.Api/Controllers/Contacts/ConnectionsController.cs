using MediatR;
using Microsoft.AspNetCore.Mvc;
using Popkin.Application.Contacts.Connections;

namespace Popkin.Api.Controllers.Contacts;

/// <summary>How a person's contacts know each other (L1-037). Only the caller's own are seen or changed (L2-122).</summary>
[ApiController]
[Route("api/contacts/connections")]
public sealed class ConnectionsController(ISender sender) : ControllerBase
{
    /// <summary>Connections (L2-149): the faces and the lines between them.</summary>
    [HttpGet]
    public Task<ConnectionMapDto> Map(CancellationToken cancellationToken) =>
        sender.Send(new GetConnectionMapQuery(), cancellationToken);

    /// <summary>"Connect" (L2-150): 201, or 200 for a resend under the same client id.</summary>
    [HttpPost]
    public async Task<ActionResult<ConnectionDto>> Connect(ConnectRequest connection, CancellationToken cancellationToken)
    {
        var made = await sender.Send(new ConnectCommand(connection), cancellationToken);
        return made.Created ? Created($"/api/contacts/connections/{made.Connection.Id}", made.Connection) : Ok(made.Connection);
    }

    /// <summary>"Remove the connection to {first name}" (L2-150 AC9).</summary>
    [HttpDelete("{connectionId:guid}")]
    public async Task<IActionResult> Disconnect(Guid connectionId, CancellationToken cancellationToken)
    {
        await sender.Send(new DisconnectCommand(connectionId), cancellationToken);
        return NoContent();
    }
}
