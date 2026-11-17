using MediatR;
using Microsoft.AspNetCore.Mvc;
using Popkin.Application.Contacts.Today;

namespace Popkin.Api.Controllers.Contacts;

/// <summary>Today (L1-030): the caller's own day in Contacts (L2-122).</summary>
[ApiController]
[Route("api/contacts/today")]
public sealed class ContactsTodayController(ISender sender) : ControllerBase
{
    /// <summary>Today (L2-125), for the device's day `on`.</summary>
    [HttpGet]
    public Task<TodayDto> Today([FromQuery] string? on, CancellationToken cancellationToken) =>
        sender.Send(new GetTodayQuery(on), cancellationToken);
}
