using MediatR;
using Popkin.Application.Contacts.Reminders;

namespace Popkin.Worker.Jobs;

/// <summary>Every 5 minutes, adds and sends the Contacts reminders that are due (L2-140).</summary>
public sealed class SendContactRemindersJob(IServiceScopeFactory scopes, TimeProvider clock, ILogger<SendContactRemindersJob> logger)
    : PeriodicJob<int>(Period, scopes, clock, logger)
{
    public static readonly TimeSpan Period = TimeSpan.FromMinutes(5);

    protected override IRequest<int> NewCommand() => new SendContactRemindersCommand();
}
