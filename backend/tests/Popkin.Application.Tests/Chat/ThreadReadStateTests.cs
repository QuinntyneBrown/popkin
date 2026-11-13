using Popkin.Domain;

namespace Popkin.Application.Tests.Chat;

/// <summary>The read point of a member in a thread never moves backwards (L2-027 AC4).</summary>
public sealed class ThreadReadStateTests
{
    private static readonly Guid Thread = Guid.NewGuid();
    private static readonly Guid Reader = Guid.NewGuid();
    private static readonly Guid Author = Guid.NewGuid();
    private static readonly DateTimeOffset Noon = new(2026, 11, 14, 12, 0, 0, TimeSpan.Zero);

    private static Message MessageAt(DateTimeOffset sentAt) => Message.Send(Thread, Author, "Hello", Guid.NewGuid(), sentAt);

    /// <summary>Two messages of the same instant, the one with the lower id first.</summary>
    private static (Message Lower, Message Higher) Twins(DateTimeOffset sentAt)
    {
        var first = MessageAt(sentAt);
        var second = MessageAt(sentAt);
        return first.Id.CompareTo(second.Id) < 0 ? (first, second) : (second, first);
    }

    [Fact]
    public void It_starts_at_the_message_read()
    {
        var message = MessageAt(Noon);

        var state = ThreadReadState.At(Reader, message, Noon.AddMinutes(1));

        Assert.Equal(Thread, state.ThreadId);
        Assert.Equal(Reader, state.MembershipId);
        Assert.Equal(message.Id, state.LastReadMessageId);
        Assert.Equal(Noon, state.LastReadSentAt);
        Assert.Equal(Noon.AddMinutes(1), state.UpdatedAt);
    }

    [Fact]
    public void A_later_message_moves_it_forward()
    {
        var state = ThreadReadState.At(Reader, MessageAt(Noon), Noon);
        var later = MessageAt(Noon.AddSeconds(1));

        var moved = state.Advance(later, Noon.AddMinutes(2));

        Assert.True(moved);
        Assert.Equal(later.Id, state.LastReadMessageId);
        Assert.Equal(Noon.AddSeconds(1), state.LastReadSentAt);
        Assert.Equal(Noon.AddMinutes(2), state.UpdatedAt);
    }

    [Fact]
    public void An_earlier_message_leaves_it_where_it_is()
    {
        var read = MessageAt(Noon);
        var state = ThreadReadState.At(Reader, read, Noon);

        var moved = state.Advance(MessageAt(Noon.AddSeconds(-1)), Noon.AddMinutes(2));

        Assert.False(moved);
        Assert.Equal(read.Id, state.LastReadMessageId);
        Assert.Equal(Noon, state.LastReadSentAt);
        Assert.Equal(Noon, state.UpdatedAt);
    }

    [Fact]
    public void The_same_message_leaves_it_where_it_is()
    {
        var read = MessageAt(Noon);
        var state = ThreadReadState.At(Reader, read, Noon);

        var moved = state.Advance(read, Noon.AddMinutes(2));

        Assert.False(moved);
        Assert.Equal(Noon, state.UpdatedAt);
    }

    [Fact]
    public void Of_two_messages_of_one_instant_the_higher_id_is_the_later()
    {
        var (lower, higher) = Twins(Noon);
        var state = ThreadReadState.At(Reader, lower, Noon);

        Assert.True(state.Advance(higher, Noon.AddMinutes(1)));
        Assert.Equal(higher.Id, state.LastReadMessageId);
        Assert.False(state.Advance(lower, Noon.AddMinutes(2)));
        Assert.Equal(higher.Id, state.LastReadMessageId);
    }

    [Fact]
    public void A_message_of_another_thread_is_not_a_read_point()
    {
        var state = ThreadReadState.At(Reader, MessageAt(Noon), Noon);
        var elsewhere = Message.Send(Guid.NewGuid(), Author, "Hello", Guid.NewGuid(), Noon.AddHours(1));

        Assert.Throws<ArgumentException>(() => state.Advance(elsewhere, Noon.AddHours(1)));
    }
}
