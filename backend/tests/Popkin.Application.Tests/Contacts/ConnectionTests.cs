// Traces to: L2-149 AC6, L2-150 AC5, AC6, AC10, known gap 109 (ruled)
// Description: A connection is one pair stored smaller id first, never a contact to itself, and its words and line kinds follow the design's tables.
using Popkin.Application.Contacts.Connections;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Tests.Contacts;

public sealed class ConnectionTests
{
    private static readonly DateTimeOffset Now = new(2026, 9, 15, 8, 40, 0, TimeSpan.Zero);
    private static readonly Guid Low = Guid.Parse("00000000-0000-0000-0000-000000000001");
    private static readonly Guid High = Guid.Parse("00000000-0000-0000-0000-000000000002");

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void The_pair_is_stored_smaller_id_first_whichever_way_it_is_made(bool lowFirst)
    {
        var connection = Connection.Connect(
            Guid.NewGuid(), lowFirst ? Low : High, lowFirst ? High : Low, ConnectionKind.Partner, "Married", false, Guid.NewGuid(), Now);

        Assert.Equal(Low, connection.ContactId);
        Assert.Equal(High, connection.OtherContactId);
        Assert.True(connection.Joins(Low));
        Assert.True(connection.Joins(High));
        Assert.Equal(High, connection.Other(Low));
    }

    [Fact]
    public void A_contact_is_not_connected_to_itself()
    {
        Assert.Throws<ArgumentException>(() =>
            Connection.Connect(Guid.NewGuid(), Low, Low, ConnectionKind.Family, null, false, Guid.NewGuid(), Now));
    }

    // In your words | Kept as | Refusal
    [Theory]
    [InlineData(null, null, null)]
    [InlineData("   ", null, null)]
    [InlineData("  Married ", "Married", null)]
    [InlineData("123456789012345678901234567890123456789012345678901234567890", "123456789012345678901234567890123456789012345678901234567890", null)]
    [InlineData("1234567890123456789012345678901234567890123456789012345678901", null, "words_too_long")]
    public void In_your_words(string? words, string? kept, string? code)
    {
        if (code is null)
        {
            Assert.Equal(kept, ConnectionRules.Words(words));
            return;
        }

        var refused = Assert.Throws<ProblemException>(() => ConnectionRules.Words(words));
        Assert.Equal(code, refused.Code);
    }

    // Kind | Accepted
    [Theory]
    [InlineData("Family", ConnectionKind.Family)]
    [InlineData("Partner", ConnectionKind.Partner)]
    [InlineData("Friend", ConnectionKind.Friend)]
    [InlineData("Work", ConnectionKind.Work)]
    public void Kinds(string kind, ConnectionKind parsed) => Assert.Equal(parsed, ConnectionRules.Kind(kind));

    [Theory]
    [InlineData(null)]
    [InlineData("family")]
    [InlineData("Enemy")]
    [InlineData("7")]
    public void Other_kinds_are_refused(string? kind) =>
        Assert.Equal("kind_not_allowed", Assert.Throws<ProblemException>(() => ConnectionRules.Kind(kind)).Code);

    // Circle | The line to "You" (L2-149 AC6)
    [Theory]
    [InlineData(ContactCircle.Family, ConnectionKind.Family)]
    [InlineData(ContactCircle.Friends, ConnectionKind.Friend)]
    [InlineData(ContactCircle.Neighbours, ConnectionKind.Friend)]
    [InlineData(ContactCircle.Clubs, ConnectionKind.Friend)]
    [InlineData(ContactCircle.Work, ConnectionKind.Work)]
    [InlineData(null, null)]
    public void The_line_to_you(ContactCircle? circle, ConnectionKind? line) =>
        Assert.Equal(line, ConnectionRules.LineToYou(circle));
}
