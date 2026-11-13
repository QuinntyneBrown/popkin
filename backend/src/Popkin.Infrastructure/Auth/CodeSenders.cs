using Microsoft.Extensions.Logging;
using Popkin.Application.Abstractions;
using Popkin.Domain;

namespace Popkin.Infrastructure.Auth;

/// <summary>
/// Development only: writes the code to the log instead of sending it, because the SMS and
/// email providers are `&lt;TO SUPPLY&gt;`. The destination is never logged (L2-054 AC3).
/// </summary>
public sealed class DevelopmentCodeSender(ContactChannel channel, ILogger<DevelopmentCodeSender> logger) : ICodeSender
{
    public ContactChannel Channel => channel;

    public Task SendAsync(string destination, string code, CancellationToken cancellationToken)
    {
        logger.LogInformation("Development {Channel} code: {Code}", channel, code);
        return Task.CompletedTask;
    }
}

/// <summary>
/// Development only: says in the log that a crew invite was sent instead of sending it, because
/// the SMS and email providers are `&lt;TO SUPPLY&gt;`. The destination, the link and the names
/// are never logged (L2-054 AC3).
/// </summary>
public sealed class DevelopmentCrewInviteSender(ContactChannel channel, ILogger<DevelopmentCrewInviteSender> logger) : ICrewInviteSender
{
    public ContactChannel Channel => channel;

    public Task SendAsync(string destination, CrewInviteMessage invite, CancellationToken cancellationToken)
    {
        logger.LogInformation("Development {Channel} crew invite: not sent, no provider is chosen", channel);
        return Task.CompletedTask;
    }
}

/// <summary>Where no provider is configured, no crew invite is sent; the Host's request is accepted all the same.</summary>
public sealed class UnconfiguredCrewInviteSender(ContactChannel channel) : ICrewInviteSender
{
    public ContactChannel Channel => channel;

    public Task SendAsync(string destination, CrewInviteMessage invite, CancellationToken cancellationToken) =>
        throw new CrewInviteNotSentException();
}

/// <summary>Where no provider is configured, every code fails to send (503 code_not_sent).</summary>
public sealed class UnconfiguredCodeSender(ContactChannel channel) : ICodeSender
{
    public ContactChannel Channel => channel;

    public Task SendAsync(string destination, string code, CancellationToken cancellationToken) =>
        throw new CodeNotSentException();
}
