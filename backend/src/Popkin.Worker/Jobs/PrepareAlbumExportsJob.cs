using MediatR;
using Popkin.Application.WrapUp;

namespace Popkin.Worker.Jobs;

/// <summary>
/// Every 2 seconds, prepares the album exports that wait (L2-046 AC4), so a member who chose
/// "Save the album" sees it begin almost at once.
/// </summary>
public sealed class PrepareAlbumExportsJob(IServiceScopeFactory scopes, TimeProvider clock, ILogger<PrepareAlbumExportsJob> logger)
    : PeriodicJob<int>(Period, scopes, clock, logger)
{
    public static readonly TimeSpan Period = TimeSpan.FromSeconds(2);

    protected override IRequest<int> NewCommand() => new PrepareAlbumExportsCommand();
}
