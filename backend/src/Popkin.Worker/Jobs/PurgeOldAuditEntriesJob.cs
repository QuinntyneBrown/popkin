using MediatR;
using Popkin.Application.Administration;

namespace Popkin.Worker.Jobs;

/// <summary>Every day, deletes the audit entries that are two years old (L2-120 AC6).</summary>
public sealed class PurgeOldAuditEntriesJob(IServiceScopeFactory scopes, TimeProvider clock, ILogger<PurgeOldAuditEntriesJob> logger)
    : PeriodicJob<int>(Period, scopes, clock, logger)
{
    public static readonly TimeSpan Period = TimeSpan.FromDays(1);

    protected override IRequest<int> NewCommand() => new PurgeOldAuditEntriesCommand();
}
