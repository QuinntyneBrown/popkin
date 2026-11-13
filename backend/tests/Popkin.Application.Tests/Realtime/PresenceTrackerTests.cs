using Microsoft.Extensions.Time.Testing;
using Popkin.Application.Realtime;

namespace Popkin.Application.Tests.Realtime;

/// <summary>
/// "Here now": a person counts once however many connections they hold, the version rises with
/// every change of the count, and a dropped connection is forgiven for 20 seconds (live-messages).
/// </summary>
public sealed class PresenceTrackerTests
{
    private static readonly Guid Lakeside = Guid.NewGuid();
    private static readonly Guid BookClub = Guid.NewGuid();
    private static readonly Guid Mara = Guid.NewGuid();
    private static readonly Guid Joel = Guid.NewGuid();

    private readonly FakeTimeProvider _clock = new();
    private readonly PresenceTracker _tracker;
    private readonly List<PresenceSnapshot> _changes = [];

    public PresenceTrackerTests()
    {
        _tracker = new PresenceTracker(_clock);
        _tracker.Changed += _changes.Add;
    }

    [Fact]
    public void Nobody_is_here_in_a_Popkin_nobody_has_open()
    {
        Assert.Equal(new PresenceSnapshot(Lakeside, 0, 0), _tracker.Get(Lakeside));
        Assert.Empty(_tracker.PeopleHere(Lakeside));
    }

    [Fact]
    public void A_person_who_connects_is_here_in_each_of_their_Popkins()
    {
        _tracker.Connect("phone", Mara, [Lakeside, BookClub]);

        Assert.Equal(new PresenceSnapshot(Lakeside, 1, 1), _tracker.Get(Lakeside));
        Assert.Equal(new PresenceSnapshot(BookClub, 1, 1), _tracker.Get(BookClub));
        Assert.Equal([Mara], _tracker.PeopleHere(Lakeside));
        Assert.Equal([new PresenceSnapshot(Lakeside, 1, 1), new PresenceSnapshot(BookClub, 1, 1)], _changes);
    }

    [Fact]
    public void A_second_person_raises_the_count_and_the_version()
    {
        _tracker.Connect("mara-phone", Mara, [Lakeside]);

        _tracker.Connect("joel-phone", Joel, [Lakeside]);

        Assert.Equal(new PresenceSnapshot(Lakeside, 2, 2), _tracker.Get(Lakeside));
        Assert.Equal([Mara, Joel], _tracker.PeopleHere(Lakeside).OrderBy(p => p == Mara ? 0 : 1));
        Assert.Equal(new PresenceSnapshot(Lakeside, 2, 2), _changes[^1]);
    }

    [Fact]
    public void A_person_with_two_connections_counts_once()
    {
        _tracker.Connect("phone", Mara, [Lakeside]);
        _changes.Clear();

        _tracker.Connect("laptop", Mara, [Lakeside]);

        Assert.Equal(new PresenceSnapshot(Lakeside, 1, 1), _tracker.Get(Lakeside));
        Assert.Empty(_changes);
    }

    [Fact]
    public void Closing_one_of_two_connections_changes_nothing_however_long_ago()
    {
        _tracker.Connect("phone", Mara, [Lakeside]);
        _tracker.Connect("laptop", Mara, [Lakeside]);
        _changes.Clear();

        _tracker.Disconnect("phone");
        _clock.Advance(TimeSpan.FromMinutes(5));

        Assert.Equal(new PresenceSnapshot(Lakeside, 1, 1), _tracker.Get(Lakeside));
        Assert.Empty(_changes);
    }

    [Fact]
    public void A_dropped_connection_still_counts_until_20_seconds_have_passed()
    {
        _tracker.Connect("phone", Mara, [Lakeside]);
        _changes.Clear();

        _tracker.Disconnect("phone");
        _clock.Advance(TimeSpan.FromSeconds(19.999));

        Assert.Equal(new PresenceSnapshot(Lakeside, 1, 1), _tracker.Get(Lakeside));
        Assert.Empty(_changes);
    }

    [Fact]
    public void After_20_seconds_without_a_reconnect_the_person_is_gone_and_the_version_rises()
    {
        _tracker.Connect("phone", Mara, [Lakeside]);
        _changes.Clear();

        _tracker.Disconnect("phone");
        _clock.Advance(TimeSpan.FromSeconds(20));

        Assert.Equal(new PresenceSnapshot(Lakeside, 2, 0), _tracker.Get(Lakeside));
        Assert.Empty(_tracker.PeopleHere(Lakeside));
        Assert.Equal([new PresenceSnapshot(Lakeside, 2, 0)], _changes);
    }

    [Fact]
    public void A_reconnect_by_the_same_person_within_the_grace_keeps_them_here()
    {
        _tracker.Connect("phone", Mara, [Lakeside]);
        _changes.Clear();

        _tracker.Disconnect("phone");
        _clock.Advance(TimeSpan.FromSeconds(15));
        _tracker.Connect("phone-again", Mara, [Lakeside]);
        _clock.Advance(TimeSpan.FromMinutes(5));

        Assert.Equal(new PresenceSnapshot(Lakeside, 1, 1), _tracker.Get(Lakeside));
        Assert.Empty(_changes);
    }

    [Fact]
    public void A_second_drop_starts_the_20_seconds_again()
    {
        _tracker.Connect("phone", Mara, [Lakeside]);
        _tracker.Disconnect("phone");
        _clock.Advance(TimeSpan.FromSeconds(15));
        _tracker.Connect("phone-again", Mara, [Lakeside]);

        _tracker.Disconnect("phone-again");
        _clock.Advance(TimeSpan.FromSeconds(15));
        var stillHere = _tracker.Get(Lakeside).HereNow;
        _clock.Advance(TimeSpan.FromSeconds(5));

        Assert.Equal(1, stillHere);
        Assert.Equal(new PresenceSnapshot(Lakeside, 2, 0), _tracker.Get(Lakeside));
    }

    [Fact]
    public void One_person_leaving_does_not_take_another_with_them()
    {
        _tracker.Connect("mara-phone", Mara, [Lakeside]);
        _tracker.Connect("joel-phone", Joel, [Lakeside]);

        _tracker.Disconnect("joel-phone");
        _clock.Advance(TimeSpan.FromSeconds(20));

        Assert.Equal(new PresenceSnapshot(Lakeside, 3, 1), _tracker.Get(Lakeside));
        Assert.Equal([Mara], _tracker.PeopleHere(Lakeside));
    }

    [Fact]
    public void A_connection_closed_twice_or_never_opened_changes_nothing()
    {
        _tracker.Connect("phone", Mara, [Lakeside]);
        _tracker.Connect("laptop", Mara, [Lakeside]);

        _tracker.Disconnect("phone");
        _tracker.Disconnect("phone");
        _tracker.Disconnect("unknown");
        _clock.Advance(TimeSpan.FromMinutes(1));

        Assert.Equal(new PresenceSnapshot(Lakeside, 1, 1), _tracker.Get(Lakeside));
    }

    [Fact]
    public void A_person_who_joins_a_Popkin_is_here_in_it_on_the_connections_they_hold()
    {
        _tracker.Connect("phone", Joel, [BookClub]);
        _tracker.Connect("laptop", Joel, []);
        _tracker.Connect("mara-phone", Mara, [Lakeside]);
        _changes.Clear();

        var connections = _tracker.Join(Joel, Lakeside);

        Assert.Equal(["laptop", "phone"], connections.Order());
        Assert.Equal(new PresenceSnapshot(Lakeside, 2, 2), _tracker.Get(Lakeside));
        Assert.Equal([new PresenceSnapshot(Lakeside, 2, 2)], _changes);
        // Both connections now hold the Popkin: the person stays until the last has gone.
        _tracker.Disconnect("phone");
        _clock.Advance(TimeSpan.FromMinutes(1));
        Assert.Equal(2, _tracker.Get(Lakeside).HereNow);
        _tracker.Disconnect("laptop");
        _clock.Advance(TimeSpan.FromSeconds(20));
        Assert.Equal(1, _tracker.Get(Lakeside).HereNow);
    }

    [Fact]
    public void A_person_who_joins_with_no_connection_open_is_not_here()
    {
        Assert.Empty(_tracker.Join(Joel, Lakeside));
        Assert.Equal(new PresenceSnapshot(Lakeside, 0, 0), _tracker.Get(Lakeside));
    }
    [Fact]
    public void A_person_who_leaves_a_Popkin_is_no_longer_here_in_it_at_once_and_stays_in_the_others()
    {
        _tracker.Connect("phone", Mara, [Lakeside, BookClub]);
        _tracker.Connect("laptop", Mara, [Lakeside, BookClub]);
        _tracker.Connect("joel-phone", Joel, [Lakeside]);

        var held = _tracker.Leave(Mara, Lakeside);

        Assert.Equal(["laptop", "phone"], held.Order());
        Assert.Equal(new PresenceSnapshot(Lakeside, 3, 1), _tracker.Get(Lakeside));
        Assert.Equal([Joel], _tracker.PeopleHere(Lakeside));
        Assert.Equal(new PresenceSnapshot(BookClub, 1, 1), _tracker.Get(BookClub));
        Assert.Equal(new PresenceSnapshot(Lakeside, 3, 1), _changes[^1]);
    }

    [Fact]
    public void A_person_who_left_is_not_counted_again_when_their_connection_drops()
    {
        _tracker.Connect("phone", Mara, [Lakeside]);
        _tracker.Leave(Mara, Lakeside);
        _changes.Clear();

        _tracker.Disconnect("phone");
        _clock.Advance(PresenceTracker.Grace);

        Assert.Equal(new PresenceSnapshot(Lakeside, 2, 0), _tracker.Get(Lakeside));
        Assert.Empty(_changes);
    }

    [Fact]
    public void A_person_who_leaves_a_Popkin_they_do_not_have_open_changes_nothing()
    {
        _tracker.Connect("joel-phone", Joel, [Lakeside]);
        _changes.Clear();

        Assert.Empty(_tracker.Leave(Mara, Lakeside));

        Assert.Equal(new PresenceSnapshot(Lakeside, 1, 1), _tracker.Get(Lakeside));
        Assert.Empty(_changes);
    }
}
