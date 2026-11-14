using Azure;
using Azure.Communication.Email;
using Azure.Communication.Sms;
using Popkin.Application.Abstractions;
using Popkin.Domain;

namespace Popkin.Infrastructure.Auth;

/// <summary>
/// The words Popkin sends by Azure Communication Services (ADR 0021). A message counts as sent
/// once the service accepts it; delivery is not awaited.
/// </summary>
internal static class CommunicationText
{
    public static string CodeSubject(string code) => $"{code} is your Popkin code";

    public static string Code(string code) =>
        $"{code} is your Popkin code. It works for 10 minutes. If you didn't ask for it, you can ignore this.";

    public static string InviteSubject(CrewInviteMessage invite) => $"{invite.HostFirstName} started {invite.PopkinName} on Popkin";

    public static string Invite(CrewInviteMessage invite) => $"{InviteSubject(invite)}. Join the crew: {invite.Link}";

    /// <summary>Hands one email to the service; false when it refuses. Nothing is logged (L2-054 AC3).</summary>
    public static async Task<bool> TrySendEmailAsync(EmailClient client, string from, string to, string subject, string text, CancellationToken cancellationToken)
    {
        try
        {
            var message = new EmailMessage(from, to, new EmailContent(subject) { PlainText = text });
            await client.SendAsync(WaitUntil.Started, message, cancellationToken);
            return true;
        }
        catch (RequestFailedException)
        {
            return false;
        }
    }

    /// <summary>Hands one text to the service; false when it refuses or reports a failure.</summary>
    public static async Task<bool> TrySendSmsAsync(SmsClient client, string from, string to, string text, CancellationToken cancellationToken)
    {
        try
        {
            var result = await client.SendAsync(from, to, text, cancellationToken: cancellationToken);
            return result.Value.Successful;
        }
        catch (RequestFailedException)
        {
            return false;
        }
    }
}

/// <summary>Sends a code by email through Azure Communication Services (ADR 0021).</summary>
public sealed class EmailCodeSender(EmailClient client, string sender) : ICodeSender
{
    public ContactChannel Channel => ContactChannel.Email;

    public async Task SendAsync(string destination, string code, CancellationToken cancellationToken)
    {
        if (!await CommunicationText.TrySendEmailAsync(client, sender, destination, CommunicationText.CodeSubject(code), CommunicationText.Code(code), cancellationToken))
        {
            throw new CodeNotSentException();
        }
    }
}

/// <summary>Sends a code by text through Azure Communication Services (ADR 0021).</summary>
public sealed class SmsCodeSender(SmsClient client, string sender) : ICodeSender
{
    public ContactChannel Channel => ContactChannel.Phone;

    public async Task SendAsync(string destination, string code, CancellationToken cancellationToken)
    {
        if (!await CommunicationText.TrySendSmsAsync(client, sender, destination, CommunicationText.Code(code), cancellationToken))
        {
            throw new CodeNotSentException();
        }
    }
}

/// <summary>Sends a crew invite by email through Azure Communication Services (ADR 0021).</summary>
public sealed class EmailCrewInviteSender(EmailClient client, string sender) : ICrewInviteSender
{
    public ContactChannel Channel => ContactChannel.Email;

    public async Task SendAsync(string destination, CrewInviteMessage invite, CancellationToken cancellationToken)
    {
        if (!await CommunicationText.TrySendEmailAsync(client, sender, destination, CommunicationText.InviteSubject(invite), CommunicationText.Invite(invite), cancellationToken))
        {
            throw new CrewInviteNotSentException();
        }
    }
}

/// <summary>Sends a crew invite by text through Azure Communication Services (ADR 0021).</summary>
public sealed class SmsCrewInviteSender(SmsClient client, string sender) : ICrewInviteSender
{
    public ContactChannel Channel => ContactChannel.Phone;

    public async Task SendAsync(string destination, CrewInviteMessage invite, CancellationToken cancellationToken)
    {
        if (!await CommunicationText.TrySendSmsAsync(client, sender, destination, CommunicationText.Invite(invite), cancellationToken))
        {
            throw new CrewInviteNotSentException();
        }
    }
}
