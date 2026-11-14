// Traces to: L2-003, L2-005, L2-006, L2-046 (ADR 0021)
using Azure;
using Azure.Communication.Email;
using Azure.Communication.Sms;
using Azure.Communication.Sms.Models;
using Popkin.Application.Abstractions;
using Popkin.Domain;
using Popkin.Infrastructure.Auth;

namespace Popkin.Infrastructure.Tests.Auth;

public sealed class CommunicationSendersTests
{
    private const string EmailFrom = "DoNotReply@popkin.community";
    private const string SmsFrom = "+18005550100";

    private static readonly CrewInviteMessage Invite = new("Lake weekend", "Maya", "https://lake.popkin.community/i/AB12CD34");

    [Fact]
    public async Task An_email_code_goes_to_the_address_with_the_code_in_its_subject_and_body()
    {
        var client = new FakeEmailClient();
        var sender = new EmailCodeSender(client, EmailFrom);

        await sender.SendAsync("sam@example.com", "482913", CancellationToken.None);

        var sent = Assert.Single(client.Sent);
        Assert.Equal(ContactChannel.Email, sender.Channel);
        Assert.Equal(EmailFrom, sent.SenderAddress);
        Assert.Equal("sam@example.com", Assert.Single(sent.Recipients.To).Address);
        Assert.Equal("482913 is your Popkin code", sent.Content.Subject);
        Assert.Equal("482913 is your Popkin code. It works for 10 minutes. If you didn't ask for it, you can ignore this.", sent.Content.PlainText);
    }

    [Fact]
    public async Task An_email_code_the_service_refuses_is_not_sent()
    {
        var sender = new EmailCodeSender(new FakeEmailClient { Refuse = true }, EmailFrom);

        await Assert.ThrowsAsync<CodeNotSentException>(() => sender.SendAsync("sam@example.com", "482913", CancellationToken.None));
    }

    [Fact]
    public async Task A_text_code_goes_to_the_number_from_the_sender()
    {
        var client = new FakeSmsClient();
        var sender = new SmsCodeSender(client, SmsFrom);

        await sender.SendAsync("+14155550148", "482913", CancellationToken.None);

        var sent = Assert.Single(client.Sent);
        Assert.Equal(ContactChannel.Phone, sender.Channel);
        Assert.Equal((SmsFrom, "+14155550148", "482913 is your Popkin code. It works for 10 minutes. If you didn't ask for it, you can ignore this."), sent);
    }

    [Theory]
    [InlineData(true, false)]
    [InlineData(false, true)]
    public async Task A_text_code_the_service_refuses_or_fails_is_not_sent(bool refuse, bool unsuccessful)
    {
        var sender = new SmsCodeSender(new FakeSmsClient { Refuse = refuse, Unsuccessful = unsuccessful }, SmsFrom);

        await Assert.ThrowsAsync<CodeNotSentException>(() => sender.SendAsync("+14155550148", "482913", CancellationToken.None));
    }

    [Fact]
    public async Task An_email_crew_invite_names_the_host_the_popkin_and_the_link()
    {
        var client = new FakeEmailClient();
        var sender = new EmailCrewInviteSender(client, EmailFrom);

        await sender.SendAsync("sam@example.com", Invite, CancellationToken.None);

        var sent = Assert.Single(client.Sent);
        Assert.Equal(ContactChannel.Email, sender.Channel);
        Assert.Equal("sam@example.com", Assert.Single(sent.Recipients.To).Address);
        Assert.Equal("Maya started Lake weekend on Popkin", sent.Content.Subject);
        Assert.Equal("Maya started Lake weekend on Popkin. Join the crew: https://lake.popkin.community/i/AB12CD34", sent.Content.PlainText);
    }

    [Fact]
    public async Task A_text_crew_invite_names_the_host_the_popkin_and_the_link()
    {
        var client = new FakeSmsClient();
        var sender = new SmsCrewInviteSender(client, SmsFrom);

        await sender.SendAsync("+14155550148", Invite, CancellationToken.None);

        Assert.Equal(ContactChannel.Phone, sender.Channel);
        Assert.Equal((SmsFrom, "+14155550148", "Maya started Lake weekend on Popkin. Join the crew: https://lake.popkin.community/i/AB12CD34"), Assert.Single(client.Sent));
    }

    [Fact]
    public async Task A_crew_invite_the_service_refuses_is_not_sent()
    {
        var email = new EmailCrewInviteSender(new FakeEmailClient { Refuse = true }, EmailFrom);
        var sms = new SmsCrewInviteSender(new FakeSmsClient { Unsuccessful = true }, SmsFrom);

        await Assert.ThrowsAsync<CrewInviteNotSentException>(() => email.SendAsync("sam@example.com", Invite, CancellationToken.None));
        await Assert.ThrowsAsync<CrewInviteNotSentException>(() => sms.SendAsync("+14155550148", Invite, CancellationToken.None));
    }

    private sealed class FakeEmailClient : EmailClient
    {
        public bool Refuse { get; init; }

        public List<EmailMessage> Sent { get; } = [];

        public override Task<EmailSendOperation> SendAsync(WaitUntil wait, EmailMessage message, CancellationToken cancellationToken = default)
        {
            if (Refuse)
            {
                throw new RequestFailedException(400, "Refused.");
            }

            Sent.Add(message);
            return Task.FromResult(new EmailSendOperation("operation", this));
        }
    }

    private sealed class FakeSmsClient : SmsClient
    {
        public bool Refuse { get; init; }

        public bool Unsuccessful { get; init; }

        public List<(string From, string To, string Message)> Sent { get; } = [];

        public override Task<Response<SmsSendResult>> SendAsync(string from, string to, string message, SmsSendOptions? options = null, CancellationToken cancellationToken = default)
        {
            if (Refuse)
            {
                throw new RequestFailedException(400, "Refused.");
            }

            Sent.Add((from, to, message));
            var result = SmsModelFactory.SmsSendResult(to, "message", Unsuccessful ? 400 : 202, !Unsuccessful, Unsuccessful ? "Refused." : null);
            return Task.FromResult(Response.FromValue(result, null!));
        }
    }
}
