using Azure;
using Azure.Communication.Email;
using Popkin.Application.Abstractions;
using EmailSendResult = Popkin.Application.Abstractions.EmailSendResult;

namespace Popkin.Infrastructure.Notifications;

/// <summary>
/// Sends a notification email through Azure Communication Services (ADR 0021): HTML and plain
/// text from `Notifications:EmailSender`, with the one-click unsubscribe headers (L2-168 AC4) and
/// no `Reply-To`, since replies are not read. Pictures travel inline, read from the private photo
/// store, under 1 MB in all (ADR 0030). Nothing it is given is logged.
/// </summary>
public sealed class AcsNotificationEmailSender(EmailClient client, string senderAddress, IPhotoStore photos) : INotificationEmailSender
{
    private const long MostInline = 1024 * 1024;

    public async Task<EmailSendResult> SendAsync(OutgoingEmailMessage message, CancellationToken cancellationToken)
    {
        var email = new EmailMessage(
            senderAddress,
            new EmailRecipients([new EmailAddress(message.To)]),
            new EmailContent(message.Email.Subject) { Html = message.Email.Html, PlainText = message.Email.Text });
        email.Headers.Add("List-Unsubscribe", $"<{message.UnsubscribePostUrl}>");
        email.Headers.Add("List-Unsubscribe-Post", "List-Unsubscribe=One-Click");
        try
        {
            long total = 0;
            foreach (var image in message.Email.InlineImages)
            {
                if (await photos.OpenAsync(image.BlobKey, cancellationToken) is not { } stored)
                {
                    continue;
                }

                await using var content = stored.Content;
                var data = await BinaryData.FromStreamAsync(content, cancellationToken);
                if (total + data.ToMemory().Length > MostInline)
                {
                    break;
                }

                total += data.ToMemory().Length;
                email.Attachments.Add(new EmailAttachment(image.ContentId, stored.ContentType, data) { ContentId = image.ContentId });
            }

            var operation = await client.SendAsync(WaitUntil.Started, email, cancellationToken);
            return new EmailSendResult.Accepted(operation.Id);
        }
        catch (RequestFailedException failure) when (failure.Status is 0 or 408 or 429 or >= 500)
        {
            return new EmailSendResult.Transient($"status_{failure.Status}");
        }
        catch (RequestFailedException failure)
        {
            return new EmailSendResult.Permanent($"status_{failure.Status}");
        }
        catch (Exception failure) when (failure is TimeoutException or HttpRequestException or TaskCanceledException && !cancellationToken.IsCancellationRequested)
        {
            return new EmailSendResult.Transient("unreachable");
        }
    }
}

/// <summary>
/// Sends nothing: the sender address, the service or the footer's postal address is not
/// configured, so the email is marked failed and never retried (deliver-notifications).
/// </summary>
public sealed class NoNotificationEmailSender : INotificationEmailSender
{
    public Task<EmailSendResult> SendAsync(OutgoingEmailMessage message, CancellationToken cancellationToken) =>
        Task.FromResult<EmailSendResult>(new EmailSendResult.Permanent("not_configured"));
}
