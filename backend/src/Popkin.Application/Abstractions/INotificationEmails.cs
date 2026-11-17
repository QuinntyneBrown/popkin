using Popkin.Application.Notifications.Emails;

namespace Popkin.Application.Abstractions;

/// <summary>A picture carried inside the email, referred to as `cid:{ContentId}` (ADR 0031).</summary>
public sealed record InlineImage(string ContentId, string BlobKey, string MediaType);

/// <summary>An email made from its model: the same words in an HTML part and a plain-text part.</summary>
public sealed record RenderedEmail(string Subject, string Html, string Text, IReadOnlyList<InlineImage> InlineImages);

/// <summary>Turns an email's model into its two parts, encoding every member's words (ADR 0031).</summary>
public interface INotificationEmailRenderer
{
    Task<RenderedEmail> RenderAsync(EmailModel model, CancellationToken cancellationToken);
}

/// <summary>An email ready for the provider, with its one-click unsubscribe (L2-168 AC4).</summary>
public sealed record OutgoingEmailMessage(string To, string FromDisplayName, RenderedEmail Email, string UnsubscribeUrl, string UnsubscribePostUrl, Guid OperationId);

/// <summary>What the provider answered.</summary>
public abstract record EmailSendResult
{
    public sealed record Accepted(string? ProviderMessageId) : EmailSendResult;

    /// <summary>A timeout, a throttle or an outage: tried again (L2-175 AC2).</summary>
    public sealed record Transient(string Reason) : EmailSendResult;

    /// <summary>Refused for good: not tried again.</summary>
    public sealed record Permanent(string Reason) : EmailSendResult;
}

/// <summary>Hands a notification email to the mail provider. Nothing it is given is logged.</summary>
public interface INotificationEmailSender
{
    Task<EmailSendResult> SendAsync(OutgoingEmailMessage message, CancellationToken cancellationToken);
}
