namespace Popkin.Application.Abstractions;

/// <summary>
/// An alert on the phone (ADR 0028): its title, its line under the title (empty for none), and
/// the app path it opens. It carries no message text a member wrote (L2-174 AC3).
/// </summary>
public sealed record PhoneAlert(string Title, string Body, string Url);

/// <summary>Sends an alert to each device a person allowed (L2-140 AC2, L2-157).</summary>
public interface IPhoneNotificationSender
{
    /// <summary>How many of the person's devices took the alert; throws when none of several did.</summary>
    Task<int> SendAsync(Guid personId, PhoneAlert alert, CancellationToken cancellationToken);
}

/// <summary>The Monday email: the words of each key date of the week ahead, soonest first.</summary>
public sealed record WeekAheadEmail(IReadOnlyList<string> Dates);

/// <summary>Sends the Monday email of the week ahead (L2-140 AC3). Nothing it is given is logged.</summary>
public interface IContactsEmailSender
{
    Task SendWeekAheadAsync(string email, WeekAheadEmail week, CancellationToken cancellationToken);
}
