using Azure;
using Azure.Communication.Email;
using Popkin.Application.Abstractions;
using Popkin.Infrastructure.Notifications;
using EmailSendResult = Popkin.Application.Abstractions.EmailSendResult;

namespace Popkin.Infrastructure.Tests.Notifications;

/// <summary>The Azure Communication Services sender of notification emails, with a stand-in client.</summary>
public sealed class AcsNotificationEmailSenderTests
{
    private sealed class FakeEmailClient(Func<EmailClient, EmailSendOperation> answer) : EmailClient
    {
        public EmailMessage? Sent { get; private set; }

        public List<Guid?> OperationIds { get; } = [];

        public override Task<EmailSendOperation> SendAsync(WaitUntil wait, EmailMessage message, CancellationToken cancellationToken = default)
        {
            Sent = message;
            OperationIds.Add(null);
            return Task.FromResult(answer(this));
        }

        public override Task<EmailSendOperation> SendAsync(WaitUntil wait, EmailMessage message, Guid operationId, CancellationToken cancellationToken = default)
        {
            Sent = message;
            OperationIds.Add(operationId);
            return Task.FromResult(answer(this));
        }
    }

    private static readonly OutgoingEmailMessage Message = new(
        "ruth@example.com",
        "Walt via Popkin",
        new RenderedEmail("Walt replied to you in Lakeside Weekend", "<p>Hi</p>", "Hi", []),
        "https://app.popkin.community/unsubscribe?t=abc",
        "https://app.popkin.community/api/notifications/unsubscribe?t=abc",
        new Guid("0e1f2a3b-0000-4000-8000-000000000001"));

    // The email's own id is the provider's operation id, so sending it again after a lost answer
    // is the same operation and is not delivered twice (L2-175 AC3).
    [Fact]
    public async Task A_resend_is_the_same_operation()
    {
        var client = new FakeEmailClient(self => new EmailSendOperation("op-1", self));
        var sender = new AcsNotificationEmailSender(client, "notify@popkin.community", new NoPhotos());

        await sender.SendAsync(Message, CancellationToken.None);
        await sender.SendAsync(Message, CancellationToken.None);

        Assert.Equal([Message.OperationId, Message.OperationId], client.OperationIds);
    }

    // Both one-click headers are set, and no Reply-To (L2-168 AC4; replies are not read).
    [Fact]
    public async Task It_sets_the_unsubscribe_headers_and_no_reply_to()
    {
        var client = new FakeEmailClient(self => new EmailSendOperation("op-1", self));

        var result = await new AcsNotificationEmailSender(client, "notify@popkin.community", new NoPhotos()).SendAsync(Message, CancellationToken.None);

        Assert.IsType<EmailSendResult.Accepted>(result);
        var sent = client.Sent!;
        Assert.Equal("<https://app.popkin.community/api/notifications/unsubscribe?t=abc>", sent.Headers["List-Unsubscribe"]);
        Assert.Equal("List-Unsubscribe=One-Click", sent.Headers["List-Unsubscribe-Post"]);
        Assert.Empty(sent.ReplyTo);
        Assert.Equal("<p>Hi</p>", sent.Content.Html);
        Assert.Equal("Hi", sent.Content.PlainText);
    }

    // A throttle or an outage is passing; a refused address is for good (L2-175 AC2).
    [Theory]
    [InlineData(429, typeof(EmailSendResult.Transient))]
    [InlineData(503, typeof(EmailSendResult.Transient))]
    [InlineData(400, typeof(EmailSendResult.Permanent))]
    public async Task A_failure_answers_passing_or_for_good(int status, Type expected)
    {
        var client = new FakeEmailClient(_ => throw new RequestFailedException(status, "refused"));

        var result = await new AcsNotificationEmailSender(client, "notify@popkin.community", new NoPhotos()).SendAsync(Message, CancellationToken.None);

        Assert.IsType(expected, result);
    }

    private sealed class NoPhotos : IPhotoStore
    {
        public Task SaveAsync(string key, ReadOnlyMemory<byte> content, string contentType, CancellationToken cancellationToken) => Task.CompletedTask;

        public Task SaveAsync(string key, Stream content, string contentType, CancellationToken cancellationToken) => Task.CompletedTask;

        public Task<StoredPhoto?> OpenAsync(string key, CancellationToken cancellationToken) => Task.FromResult<StoredPhoto?>(null);

        public Task DeleteAsync(string key, CancellationToken cancellationToken) => Task.CompletedTask;

        public string GetReadUrl(string key) => throw new NotSupportedException();

        public string GetDownloadUrl(string key, string fileName) => throw new NotSupportedException();
    }
}
