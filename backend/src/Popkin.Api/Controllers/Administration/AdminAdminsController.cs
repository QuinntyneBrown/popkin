using MediatR;
using Microsoft.AspNetCore.Mvc;
using Popkin.Application.Administration;
using Popkin.Domain;

namespace Popkin.Api.Controllers.Administration;

/// <summary>Admins &amp; roles: who can sign in to the console, decided by an Owner (L2-119).</summary>
[Route("api/admin/admins")]
public sealed class AdminAdminsController(ISender sender) : AdminControllerBase
{
    [HttpGet]
    public async Task<ActionResult<AdminListDto>> GetAdmins(CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetAdminsQuery(), cancellationToken));

    public sealed record AddAdminRequest(string? Email, AdminRole Role);

    [HttpPost]
    public async Task<ActionResult<AdminRowDto>> AddAdmin(AddAdminRequest request, CancellationToken cancellationToken)
    {
        var added = await sender.Send(new AddAdminCommand(request.Email, request.Role), cancellationToken);
        return Created($"/api/admin/admins/{added.Id}", added);
    }

    public sealed record ChangeRoleRequest(AdminRole Role, string? Reason);

    [HttpPut("{adminId:guid}/role")]
    public async Task<ActionResult<AdminRowDto>> ChangeRole(Guid adminId, ChangeRoleRequest request, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new ChangeAdminRoleCommand(adminId, request.Role, request.Reason), cancellationToken));

    public sealed record RemoveAdminRequest(string? Reason);

    /// <summary>A named action, not DELETE, because it carries a reason and the admin's record is kept.</summary>
    [HttpPost("{adminId:guid}/remove")]
    public async Task<IActionResult> RemoveAdmin(Guid adminId, RemoveAdminRequest request, CancellationToken cancellationToken)
    {
        await sender.Send(new RemoveAdminCommand(adminId, request.Reason), cancellationToken);
        return NoContent();
    }
}
