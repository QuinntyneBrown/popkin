using MediatR;
using Microsoft.AspNetCore.Mvc;
using Popkin.Application.Account;

namespace Popkin.Api.Controllers;

/// <summary>
/// The signed-in person's own account, authenticated by the fallback policy. It acts only on the
/// caller, so a person sees and changes only their own account.
/// </summary>
[ApiController]
[Route("api/account")]
public sealed class AccountController(ISender sender) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<AccountDto>> Get(CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetAccountQuery(), cancellationToken));

    public sealed record UpdateAccountRequest(string? Name);

    /// <summary>A new name (L2-048 AC2); 400 `name_invalid` unless it is 1 to 40 characters (AC3).</summary>
    [HttpPatch]
    public async Task<ActionResult<AccountDto>> Update(UpdateAccountRequest request, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new UpdateAccountNameCommand(request.Name), cancellationToken));
}
