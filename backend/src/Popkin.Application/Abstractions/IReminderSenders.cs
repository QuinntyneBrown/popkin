namespace Popkin.Application.Abstractions;

/// <summary>A reminder on the phone (ADR 0028): its words, and the contact it opens.</summary>
public sealed record PhoneReminder(string Words, Guid? ContactId);

/// <summary>Sends a reminder to each device a person allowed (L2-140 AC2).</summary>
public interface IPhoneNotificationSender
{
    Task SendAsync(Guid personId, PhoneReminder reminder, CancellationToken cancellationToken);
}

/// <summary>The Monday email: the words of each key date of the week ahead, soonest first.</summary>
public sealed record WeekAheadEmail(IReadOnlyList<string> Dates);

/// <summary>Sends the Monday email of the week ahead (L2-140 AC3). Nothing it is given is logged.</summary>
public interface IContactsEmailSender
{
    Task SendWeekAheadAsync(string email, WeekAheadEmail week, CancellationToken cancellationToken);
}
