using MediatR;
using Popkin.Application.Account;

namespace Popkin.Worker.Jobs;

/// <summary>
/// Every day, erases the personal data of the accounts deleted since the last tick, so it is
/// gone within a day of deletion, well inside the 30 days of L2-049 AC4.
/// </summary>
public sealed class PurgeDeletedAccountsJob(IServiceScopeFactory scopes, TimeProvider clock, ILogger<PurgeDeletedAccountsJob> logger)
    : PeriodicJob<int>(Period, scopes, clock, logger)
{
    public static readonly TimeSpan Period = TimeSpan.FromDays(1);

    protected override IRequest<int> NewCommand() => new PurgeDeletedAccountsCommand();
}
