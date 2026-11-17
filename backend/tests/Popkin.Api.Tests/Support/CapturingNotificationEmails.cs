using Popkin.Application.Abstractions;

namespace Popkin.Api.Tests.Support;

/// <summary>Stands in for Azure Communication Services: keeps each notification email it is handed.</summary>
public sealed class CapturingNotificationEmails : INotificationEmailSender
{
    private readonly List<OutgoingEmailMessage> _sent = [];

    /// <summary>What the next sends answer instead of accepting, in order; empty accepts.</summary>
    public Queue<EmailSendResult> Answers { get; } = new();

    /// <summary>Throws on the next send only, as a sender that breaks once would.</summary>
    public bool ThrowOnce { get; set; }

    public int Attempts { get; private set; }

    public IReadOnlyList<OutgoingEmailMessage> Sent => _sent;

    /// <summary>Forgets what was sent and tried so far, so a test sees only what follows.</summary>
    public void Clear()
    {
        _sent.Clear();
        Attempts = 0;
    }

    public Task<EmailSendResult> SendAsync(OutgoingEmailMessage message, CancellationToken cancellationToken)
    {
        Attempts++;
        if (ThrowOnce)
        {
            ThrowOnce = false;
            throw new InvalidOperationException("The sender broke.");
        }

        if (Answers.TryDequeue(out var answer) && answer is not EmailSendResult.Accepted)
        {
            return Task.FromResult(answer);
        }

        _sent.Add(message);
        return Task.FromResult<EmailSendResult>(new EmailSendResult.Accepted($"op-{_sent.Count}"));
    }
}
