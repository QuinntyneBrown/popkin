using Popkin.Application.Abstractions;

namespace Popkin.Api.Tests.Support;

public sealed class CapturingPhoneNotifications : IPhoneNotificationSender
{
    private readonly List<(Guid PersonId, PhoneAlert Alert)> _sent = [];

    public bool Fail { get; set; }

    public IReadOnlyList<(Guid PersonId, PhoneAlert Alert)> Sent => _sent;

    /// <summary>Forgets what was sent so far, so a test sees only what follows.</summary>
    public void Clear() => _sent.Clear();

    public Task<int> SendAsync(Guid personId, PhoneAlert alert, CancellationToken cancellationToken)
    {
        if (Fail)
        {
            throw new InvalidOperationException("No device took the phone alert.");
        }

        _sent.Add((personId, alert));
        return Task.FromResult(1);
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
