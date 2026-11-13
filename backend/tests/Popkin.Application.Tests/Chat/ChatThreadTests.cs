using Popkin.Domain;

namespace Popkin.Application.Tests.Chat;

/// <summary>Who may read a thread, and the ordered pair of a direct message (L2-023 AC2, L2-051).</summary>
public sealed class ChatThreadTests
{
    private static readonly Guid Popkin = Guid.NewGuid();
    private static readonly DateTimeOffset Noon = new(2026, 11, 14, 12, 0, 0, TimeSpan.Zero);

    /// <summary>Two membership ids, the lower first.</summary>
    private static (Guid Lower, Guid Higher) Pair()
    {
        var first = Guid.NewGuid();
        var second = Guid.NewGuid();
        return first.CompareTo(second) < 0 ? (first, second) : (second, first);
    }

    [Fact]
    public void Everyone_is_read_by_any_member()
    {
        var thread = ChatThread.Everyone(Popkin, Noon);

        Assert.True(thread.CanRead(Guid.NewGuid()));
        Assert.Null(thread.MemberAId);
        Assert.Null(thread.MemberBId);
    }

    [Fact]
    public void A_direct_message_is_read_by_its_two_members_only()
    {
        var (lower, higher) = Pair();
        var thread = ChatThread.Direct(Popkin, lower, higher, Noon);

        Assert.True(thread.CanRead(lower));
        Assert.True(thread.CanRead(higher));
        Assert.False(thread.CanRead(Guid.NewGuid()));
        Assert.False(thread.CanRead(Guid.Empty));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void A_direct_message_stores_its_pair_lowest_first_whoever_opens_it(bool higherOpens)
    {
        var (lower, higher) = Pair();

        var thread = higherOpens ? ChatThread.Direct(Popkin, higher, lower, Noon) : ChatThread.Direct(Popkin, lower, higher, Noon);

        Assert.Equal(ChatThreadKind.Direct, thread.Kind);
        Assert.Equal(Popkin, thread.PopkinId);
        Assert.Equal(Noon, thread.CreatedAt);
        Assert.Equal(lower, thread.MemberAId);
        Assert.Equal(higher, thread.MemberBId);
        Assert.Equal((lower, higher), ChatThread.OrderedPair(higher, lower));
    }

    [Fact]
    public void The_other_member_of_a_direct_message_is_the_one_who_is_not_reading()
    {
        var (lower, higher) = Pair();
        var thread = ChatThread.Direct(Popkin, lower, higher, Noon);

        Assert.Equal(higher, thread.OtherThan(lower));
        Assert.Equal(lower, thread.OtherThan(higher));
        Assert.Null(ChatThread.Everyone(Popkin, Noon).OtherThan(lower));
    }

    [Fact]
    public void Nobody_has_a_direct_message_with_themselves()
    {
        var member = Guid.NewGuid();

        Assert.Throws<ArgumentException>(() => ChatThread.Direct(Popkin, member, member, Noon));
    }
}
