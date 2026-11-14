using System.Diagnostics.Metrics;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Api.Tests.Support;
using Popkin.Application.Telemetry;
using Popkin.Application.WrapUp;
using Popkin.Domain;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Api.Tests.WrapUp;

/// <summary>
/// `WrapUpDuePopkinsCommand`, which the Worker sends every 30 seconds, reached here through
/// MediatR with the clock set before and after an end date (L2-044 AC1, AC3).
/// </summary>
public sealed class TimeIsUpTests
{
    /// <summary>Starts Popkins straight in the store, each ending at the time given, and returns their ids.</summary>
    private static async Task<List<Guid>> StartPopkinsAsync(ApiFactory api, int count, DateTimeOffset? endsAt)
    {
        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var host = Person.Create("Mara Okafor", ContactChannel.Email, $"{Guid.NewGuid():N}@example.com", api.Clock.GetUtcNow());
        db.People.Add(host);
        var ids = new List<Guid>();
        for (var number = 1; number <= count; number++)
        {
            var (popkin, everyone) = PopkinSpace.Start(host, $"Popkin {number}", "🎈", PopkinColour.Coral, PopkinLength.UntilDate, endsAt, $"code{Guid.NewGuid():N}", api.Clock.GetUtcNow());
            db.Popkins.Add(popkin);
            db.ChatThreads.Add(everyone);
            ids.Add(popkin.Id);
        }

        await db.SaveChangesAsync();
        return ids;
    }

    // Given a Popkin with an end date and a member who has it open,
    // when the tick comes a second before the end, then it stays active;
    // when the tick comes at the end, then it is wrapped up with its album kept and the member is told;
    // and the next tick finds nothing to do.
    [Fact]
    public async Task A_Popkin_wraps_up_when_its_time_is_up_with_its_album_kept()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        await using var hub = await api.CreateHubConnectionAsync(lakeside.Host);
        api.Clock.SetUtcNow(lakeside.EndsAt!.Value.AddSeconds(-1));

        var early = await api.SendAsync(new WrapUpDuePopkinsCommand());
        var statusEarly = api.StoredPopkin(lakeside.Id).Status;
        api.Clock.SetUtcNow(lakeside.EndsAt.Value);
        var due = await api.SendAsync(new WrapUpDuePopkinsCommand());
        var again = await api.SendAsync(new WrapUpDuePopkinsCommand());

        Assert.Equal(0, early);
        Assert.Equal(PopkinStatus.Active, statusEarly);
        Assert.Equal(1, due);
        Assert.Equal(0, again);
        var stored = api.StoredPopkin(lakeside.Id);
        Assert.Equal(PopkinStatus.WrappedUp, stored.Status);
        Assert.Equal(lakeside.EndsAt, stored.WrappedUpAt);
        Assert.True(stored.KeepPhotos);
        Assert.Null(stored.PhotosRemoveAt);
        var wrappedUp = await hub.WaitForAsync("PopkinWrappedUp");
        Assert.Equal(lakeside.Id, wrappedUp.Arguments[0].GetGuid());
    }

    // Given a Popkin with no end date, when a year of ticks has passed, then it is still active (L2-044 AC3).
    [Fact]
    public async Task A_Popkin_with_no_end_date_never_wraps_up_by_itself()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync("KeepItGoing");
        api.Clock.Advance(TimeSpan.FromDays(365));

        var wrappedUp = await api.SendAsync(new WrapUpDuePopkinsCommand());

        Assert.Equal(0, wrappedUp);
        Assert.Equal(PopkinStatus.Active, api.StoredPopkin(lakeside.Id).Status);
    }

    // Given more Popkins whose time is up than one batch holds,
    // when one tick comes, then every one of them is wrapped up.
    [Fact]
    public async Task One_tick_wraps_up_more_than_a_batch()
    {
        using var api = new ApiFactory();
        var count = WrapUpDuePopkinsCommandHandler.BatchSize + 1;
        var ids = await StartPopkinsAsync(api, count, api.Clock.GetUtcNow().AddHours(1));
        var ongoing = await StartPopkinsAsync(api, 1, endsAt: null);
        api.Clock.Advance(TimeSpan.FromHours(1));

        var wrappedUp = await api.SendAsync(new WrapUpDuePopkinsCommand());

        Assert.Equal(count, wrappedUp);
        Assert.All(ids, id => Assert.Equal(PopkinStatus.WrappedUp, api.StoredPopkin(id).Status));
        Assert.Equal(PopkinStatus.Active, api.StoredPopkin(ongoing[0]).Status);
    }

    // Given the Host wraps the Popkin up, without its album, in the moment its time is up,
    // when the tick's wrap-up loses to the Host's, then it is skipped and the Host's choice stands.
    [Fact]
    public async Task A_Popkin_its_Host_wrapped_up_in_the_same_moment_is_skipped()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        api.Clock.SetUtcNow(lakeside.EndsAt!.Value);
        api.Faults.LoseNextSaveTo = () => api.WrapUpAsync(lakeside.Id, keepPhotos: false);

        var wrappedUp = await api.SendAsync(new WrapUpDuePopkinsCommand());

        Assert.Equal(0, wrappedUp);
        Assert.False(api.StoredPopkin(lakeside.Id).KeepPhotos);
    }

    // Given two Popkins whose time is up, the first of which cannot be saved,
    // when the tick comes, then the other is wrapped up all the same, and the next tick wraps up the first.
    [Fact]
    public async Task A_Popkin_that_cannot_be_saved_holds_back_no_other()
    {
        using var api = new ApiFactory();
        var first = await StartPopkinsAsync(api, 1, api.Clock.GetUtcNow().AddMinutes(30));
        var second = await StartPopkinsAsync(api, 1, api.Clock.GetUtcNow().AddMinutes(45));
        api.Clock.Advance(TimeSpan.FromHours(1));
        api.Faults.LoseNextSaveTo = () => Task.CompletedTask;

        var onTheTick = await api.SendAsync(new WrapUpDuePopkinsCommand());
        var afterTheTick = (api.StoredPopkin(first[0]).Status, api.StoredPopkin(second[0]).Status);
        var onTheNext = await api.SendAsync(new WrapUpDuePopkinsCommand());

        Assert.Equal(1, onTheTick);
        Assert.Equal((PopkinStatus.Active, PopkinStatus.WrappedUp), afterTheTick);
        Assert.Equal(1, onTheNext);
        Assert.Equal(PopkinStatus.WrappedUp, api.StoredPopkin(first[0]).Status);
    }

    // Given a Popkin whose end date passed 45 seconds ago,
    // when the tick wraps it up, then the lateness is measured as 45 seconds on the `Popkin` meter (ADR 0012).
    [Fact]
    public async Task How_late_a_wrap_up_was_is_measured()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var measured = new List<double>();
        using var listener = new MeterListener();
        listener.InstrumentPublished = (instrument, l) =>
        {
            if (instrument.Meter.Name == PopkinMetrics.MeterName && instrument.Name == "popkin.wrap_up.lateness")
            {
                l.EnableMeasurementEvents(instrument);
            }
        };
        listener.SetMeasurementEventCallback<double>((_, measurement, _, _) => measured.Add(measurement));
        listener.Start();
        api.Clock.SetUtcNow(lakeside.EndsAt!.Value.AddSeconds(45));

        await api.SendAsync(new WrapUpDuePopkinsCommand());

        Assert.Equal([45d], measured);
    }
}
