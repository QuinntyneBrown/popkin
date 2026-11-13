using MediatR;

namespace Popkin.Worker.Jobs;

/// <summary>
/// A job as the Worker hosts it: the loop alone. On every tick of its period it opens a scope
/// and sends one command through MediatR; what is due, what happens to it and who is told
/// belong to the command's handler. A tick that throws is logged and the next one runs; when
/// stopping is asked, the tick in hand finishes and no other starts.
/// </summary>
public abstract class PeriodicJob<TResponse>(TimeSpan period, IServiceScopeFactory scopes, TimeProvider clock, ILogger logger) : BackgroundService
{
    private PeriodicTimer? _timer;

    /// <summary>The command of one tick.</summary>
    protected abstract IRequest<TResponse> NewCommand();

    /// <summary>Called after each tick, whether or not it failed.</summary>
    protected virtual void Ticked()
    {
    }

    public override Task StartAsync(CancellationToken cancellationToken)
    {
        // Built from the injected clock, so a test advances the time and the job ticks at once;
        // and built here, before the loop runs, so the first period counts from the start.
        _timer = new PeriodicTimer(period, clock);
        return base.StartAsync(cancellationToken);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var job = GetType().Name;
        try
        {
            while (await _timer!.WaitForNextTickAsync(stoppingToken))
            {
                try
                {
                    await using var scope = scopes.CreateAsyncScope();
                    // The handler finishes what it has in hand when stopping is asked, and begins nothing new.
                    await scope.ServiceProvider.GetRequiredService<ISender>().Send(NewCommand(), stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception exception)
                {
                    logger.LogError(exception, "A tick of {Job} failed", job);
                }

                Ticked();
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
        }

        logger.LogInformation("{Job} stopped", job);
    }

    public override void Dispose()
    {
        _timer?.Dispose();
        base.Dispose();
    }
}
