using MediatR;
using Microsoft.AspNetCore.Mvc;
using Popkin.Application.Contacts.Groups;

namespace Popkin.Api.Controllers.Contacts;

/// <summary>Households, small groups, teams and clubs (L1-036). Only the caller's own are seen or changed (L2-122).</summary>
[ApiController]
[Route("api/contacts/groups")]
public sealed class GroupsController(ISender sender) : ControllerBase
{
    /// <summary>Groups (L2-146), for the device's day `on`.</summary>
    [HttpGet]
    public Task<IReadOnlyList<GroupDto>> Groups([FromQuery] string? on, CancellationToken cancellationToken) =>
        sender.Send(new GetGroupsQuery(on), cancellationToken);

    /// <summary>"Make the group" (L2-147): 201, or 200 for a resend under the same client id.</summary>
    [HttpPost]
    public async Task<ActionResult<GroupDto>> Make(MakeGroupRequest group, [FromQuery] string? on, CancellationToken cancellationToken)
    {
        var made = await sender.Send(new MakeGroupCommand(group, on), cancellationToken);
        return made.Created ? Created($"/api/contacts/groups/{made.Group.Id}", made.Group) : Ok(made.Group);
    }

    /// <summary>"Add {n} people" (L2-147 AC3).</summary>
    [HttpPost("{groupId:guid}/members")]
    public Task<GroupDto> AddPeople(Guid groupId, AddGroupPeopleRequest people, [FromQuery] string? on, CancellationToken cancellationToken) =>
        sender.Send(new AddGroupPeopleCommand(groupId, people, on), cancellationToken);

    /// <summary>"Start a Popkin with them" (L2-148 AC3): links the group and invites its members.</summary>
    [HttpPost("{groupId:guid}/popkin")]
    public async Task<IActionResult> LinkPopkin(Guid groupId, LinkGroupPopkinRequest link, CancellationToken cancellationToken)
    {
        await sender.Send(new LinkGroupPopkinCommand(groupId, link), cancellationToken);
        return Accepted();
    }
}
