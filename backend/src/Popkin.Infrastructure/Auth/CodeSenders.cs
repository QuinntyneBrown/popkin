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

/// <summary>Where no provider is configured, every code fails to send (503 code_not_sent).</summary>
public sealed class UnconfiguredCodeSender(ContactChannel channel) : ICodeSender
{
    public ContactChannel Channel => channel;

    public Task SendAsync(string destination, string code, CancellationToken cancellationToken) =>
        throw new CodeNotSentException();
}
