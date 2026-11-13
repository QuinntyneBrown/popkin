using System.Diagnostics.Metrics;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Time.Testing;
using Popkin.Application.Account;
using Popkin.Application.Telemetry;
using Popkin.Application.WrapUp;
using Popkin.Worker.Jobs;

namespace Popkin.Worker.Tests;

/// <summary>
/// The Worker's jobs, each the loop alone: on every tick of its period it sends one command
/// through MediatR. The clock is a `FakeTimeProvider` and MediatR is stood in for, so no test
/// waits for real time or touches a database (ADR 0005, ADR 0010). What each command does is
/// proved through MediatR in `Popkin.Api.Tests`.
/// </summary>
public sealed class JobTests : IDisposable
{
    private static readonly DateTimeOffset Start = new(2026, 9, 13, 18, 0, 0, TimeSpan.Zero);

    private readonly FakeTimeProvider _clock = new(Start);
    private readonly RecordingSender _sender = new();
    private readonly ServiceProvider _services;

    public JobTests()
    {
        _services = new ServiceCollection()
            .AddMetrics()
            .AddSingleton<PopkinMetrics>()
            .AddScoped<ISender>(_ => _sender)
            .BuildServiceProvider();
    }

    public void Dispose() => _services.Dispose();

    public static TheoryData<string, int, Type> Jobs => new()
    {
        { nameof(WrapUpDuePopkinsJob), 30, typeof(WrapUpDuePopkinsCommand) },
        { nameof(RemovePhotosOfWrappedUpPopkinsJob), 3600, typeof(RemoveWrappedUpAlbumsCommand) },
        { nameof(PrepareAlbumExportsJob), 2, typeof(PrepareAlbumExportsCommand) },
        { nameof(PurgeDeletedAccountsJob), 86400, typeof(PurgeDeletedAccountsCommand) },
    };

    private BackgroundService Job(string name)
    {
        var scopes = _services.GetRequiredService<IServiceScopeFactory>();
        return name switch
        {
            nameof(WrapUpDuePopkinsJob) => new WrapUpDuePopkinsJob(
                scopes, _clock, _services.GetRequiredService<PopkinMetrics>(), NullLogger<WrapUpDuePopkinsJob>.Instance),
            nameof(RemovePhotosOfWrappedUpPopkinsJob) => new RemovePhotosOfWrappedUpPopkinsJob(
                scopes, _clock, NullLogger<RemovePhotosOfWrappedUpPopkinsJob>.Instance),
            nameof(PrepareAlbumExportsJob) => new PrepareAlbumExportsJob(scopes, _clock, NullLogger<PrepareAlbumExportsJob>.Instance),
            nameof(PurgeDeletedAccountsJob) => new PurgeDeletedAccountsJob(scopes, _clock, NullLogger<PurgeDeletedAccountsJob>.Instance),
            _ => throw new ArgumentOutOfRangeException(nameof(name)),
        };
    }

    // Given a job that has started, when a second short of its period has passed, then it has sent nothing;
    // when its period has passed, then it has sent its command once, and once more a period later.
    [Theory]
    [MemberData(nameof(Jobs))]
    public async Task A_tick_sends_one_command(string name, int periodSeconds, Type command)
    {
        using var job = Job(name);
        await job.StartAsync(CancellationToken.None);

        _clock.Advance(TimeSpan.FromSeconds(periodSeconds - 1));
        var before = _sender.Sent.Count;
        _clock.Advance(TimeSpan.FromSeconds(1));
        await _sender.WaitForAsync(1);
        var afterOne = _sender.Sent;
        _clock.Advance(TimeSpan.FromSeconds(periodSeconds));
        await _sender.WaitForAsync(2);

        Assert.Equal(0, before);
        Assert.IsType(command, Assert.Single(afterOne));
        Assert.Equal([command, command], _sender.Sent.Select(s => s.GetType()));
        await job.StopAsync(CancellationToken.None);
    }

    // Given a job whose first tick fails, when its period passes again, then it sends its command again.
    [Theory]
    [MemberData(nameof(Jobs))]
    public async Task A_tick_that_throws_is_followed_by_the_next(string name, int periodSeconds, Type command)
    {
        _sender.Failing.Add(1);
        using var job = Job(name);
        await job.StartAsync(CancellationToken.None);

        _clock.Advance(TimeSpan.FromSeconds(periodSeconds));
        await _sender.WaitForAsync(1);
        _clock.Advance(TimeSpan.FromSeconds(periodSeconds));
        await _sender.WaitForAsync(2);

        Assert.Equal([command, command], _sender.Sent.Select(s => s.GetType()));
        Assert.False(job.ExecuteTask!.IsCompleted);
        await job.StopAsync(CancellationToken.None);
    }

    // Given a job that has ticked once, when it is stopped, then its loop has ended, and a period later nothing more is sent.
    [Theory]
    [MemberData(nameof(Jobs))]
    public async Task Stopping_ends_the_loop(string name, int periodSeconds, Type command)
    {
        using var job = Job(name);
        await job.StartAsync(CancellationToken.None);
        _clock.Advance(TimeSpan.FromSeconds(periodSeconds));
        await _sender.WaitForAsync(1);

        await job.StopAsync(CancellationToken.None);
        _clock.Advance(TimeSpan.FromSeconds(periodSeconds));

        Assert.True(job.ExecuteTask!.IsCompletedSuccessfully);
        Assert.IsType(command, Assert.Single(_sender.Sent));
    }

    // Given the wrap-up job, when a tick finishes, then `popkin.wrap_up.last_tick` holds the time
    // it finished, in seconds since the Unix epoch: the Worker's heartbeat (ADR 0012).
    [Fact]
    public async Task The_wrap_up_job_records_when_its_tick_finished()
    {
        var recorded = new TaskCompletionSource<double>(TaskCreationOptions.RunContinuationsAsynchronously);
        using var listener = new MeterListener();
        listener.InstrumentPublished = (instrument, l) =>
        {
            if (instrument.Meter.Name == PopkinMetrics.MeterName && instrument.Name == "popkin.wrap_up.last_tick")
            {
                l.EnableMeasurementEvents(instrument);
            }
        };
        listener.SetMeasurementEventCallback<double>((_, measurement, _, _) => recorded.TrySetResult(measurement));
        listener.Start();
        using var job = Job(nameof(WrapUpDuePopkinsJob));
        await job.StartAsync(CancellationToken.None);

        _clock.Advance(TimeSpan.FromSeconds(30));
        var lastTick = await recorded.Task.WaitAsync(TimeSpan.FromSeconds(5));

        Assert.Equal(Start.AddSeconds(30).ToUnixTimeSeconds(), lastTick);
        await job.StopAsync(CancellationToken.None);
    }
}
