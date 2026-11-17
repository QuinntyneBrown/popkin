using Popkin.Application.Abstractions;

namespace Popkin.Api.Tests.Support;

public sealed class CapturingPhoneNotifications : IPhoneNotificationSender
{
    private readonly List<(Guid PersonId, PhoneReminder Reminder)> _sent = [];

    public bool Fail { get; set; }

    public IReadOnlyList<(Guid PersonId, PhoneReminder Reminder)> Sent => _sent;

    public Task SendAsync(Guid personId, PhoneReminder reminder, CancellationToken cancellationToken)
    {
        if (Fail)
        {
            throw new InvalidOperationException("No device took the phone reminder.");
        }

        _sent.Add((personId, reminder));
        return Task.CompletedTask;
    }
}

public sealed class CapturingWeekAheadEmails : IContactsEmailSender
{
    private readonly List<(string Email, WeekAheadEmail Week)> _sent = [];

    public IReadOnlyList<(string Email, WeekAheadEmail Week)> Sent => _sent;

    public Task SendWeekAheadAsync(string email, WeekAheadEmail week, CancellationToken cancellationToken)
    {
        _sent.Add((email, week));
        return Task.CompletedTask;
    }
}
