using MediatR;
using Microsoft.AspNetCore.Mvc;
using Popkin.Application.WrapUp;

namespace Popkin.Api.Controllers;

/// <summary>The recap of a wrapped-up Popkin. Every action needs a session and a membership (L2-050, L2-051).</summary>
[ApiController]
[Route("api/popkins/{popkinId:guid}/recap")]
public sealed class RecapController(ISender sender) : ControllerBase
{
    /// <summary>The recap (L2-046 AC1 to AC3); 409 `popkin_active` while the Popkin has not wrapped up.</summary>
    [HttpGet]
    public async Task<ActionResult<RecapDto>> Get(Guid popkinId, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetRecapQuery(popkinId), cancellationToken));
}
