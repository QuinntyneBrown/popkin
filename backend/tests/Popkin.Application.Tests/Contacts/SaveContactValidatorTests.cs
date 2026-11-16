using Popkin.Application.Contacts.People;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Tests.Contacts;

/// <summary>
/// The rules of the contact form, for add and edit alike (L2-129 AC4; the limits are the interim
/// ruling of known gap 102).
/// </summary>
public sealed class SaveContactValidatorTests
{
    [Theory]
    // 1 to 40 characters, less the white space around them, as a person's name is.
    [InlineData("F", null)]
    [InlineData("  Femi Bankole ", null)]
    [InlineData(40, null)]
    [InlineData(41, "contact_field_too_long")]
    [InlineData(null, "contact_name_required")]
    [InlineData("", "contact_name_required")]
    [InlineData("   ", "contact_name_required")]
    public void A_name_is_1_to_40_characters(object? given, string? refusal)
    {
        var request = Request() with { Name = Text(given) };

        if (refusal is null)
        {
            Assert.Equal(Text(given)!.Trim(), SaveContactValidator.Validate(request).Name);
        }
        else
        {
            AssertRefused(request, refusal, "name");
        }
    }

    [Theory]
    [InlineData("knownAs", 60, null)]
    [InlineData("knownAs", 61, "contact_field_too_long")]
    [InlineData("city", 60, null)]
    [InlineData("city", 61, "contact_field_too_long")]
    public void How_you_know_them_and_the_city_are_at_most_60_characters(string field, int length, string? refusal)
    {
        var text = new string('a', length);
        var request = field == "knownAs" ? Request() with { KnownAs = text } : Request() with { City = text };

        if (refusal is null)
        {
            SaveContactValidator.Validate(request);
        }
        else
        {
            AssertRefused(request, refusal, field);
        }
    }

    [Theory]
    // As typed, wherever they live: 7 to 15 digits, with spaces, +, brackets, dashes and dots.
    [InlineData("07700 900123", null)]
    [InlineData("(415) 555-0148", null)]
    [InlineData("+44 7700 900123", null)]
    [InlineData("+234.803.555.0101", null)]
    [InlineData("555 0101", null)]
    [InlineData("12345", "contact_phone_invalid")]
    [InlineData("+1 234 567 890 123 456", "contact_phone_invalid")]
    [InlineData("call me", "contact_phone_invalid")]
    [InlineData("0770 ext 12", "contact_phone_invalid")]
    [InlineData("   ", null)]
    [InlineData(null, null)]
    public void A_phone_is_7_to_15_digits_as_typed(string? phone, string? refusal)
    {
        var request = Request() with { Phone = phone };

        if (refusal is null)
        {
            SaveContactValidator.Validate(request);
        }
        else
        {
            AssertRefused(request, refusal, "phone");
        }
    }

    [Theory]
    [InlineData("femi@example.com", null)]
    [InlineData(" Femi@Example.co.uk ", null)]
    [InlineData("femi@example", "contact_email_invalid")]
    [InlineData("femi example.com", "contact_email_invalid")]
    [InlineData("@example.com", "contact_email_invalid")]
    [InlineData("", null)]
    [InlineData(null, null)]
    public void An_email_has_the_shape_of_one(string? email, string? refusal)
    {
        var request = Request() with { Email = email };

        if (refusal is null)
        {
            SaveContactValidator.Validate(request);
        }
        else
        {
            AssertRefused(request, refusal, "email");
        }
    }

    [Fact]
    public void An_email_over_254_characters_is_refused() =>
        AssertRefused(Request() with { Email = new string('a', 243) + "@example.com" }, "contact_email_invalid", "email");

    [Theory]
    [InlineData(12, 40, null)]
    [InlineData(13, 5, "contact_field_too_long")]
    [InlineData(1, 41, "contact_field_too_long")]
    public void At_most_12_things_they_love_each_at_most_40_characters(int count, int length, string? refusal)
    {
        var request = Request() with { Loves = Enumerable.Repeat(new string('a', length), count).ToList() };

        if (refusal is null)
        {
            Assert.Equal(count, SaveContactValidator.Validate(request).Details.Loves.Count);
        }
        else
        {
            AssertRefused(request, refusal, "loves");
        }
    }

    [Fact]
    public void Blank_things_they_love_are_not_counted() =>
        Assert.Single(SaveContactValidator.Validate(
            Request() with { Loves = [.. Enumerable.Repeat(" ", 20), "Jazz"] }).Details.Loves);

    [Theory]
    [InlineData("Family", ContactCircle.Family)]
    [InlineData("Clubs", ContactCircle.Clubs)]
    [InlineData(null, null)]
    [InlineData("", null)]
    public void A_circle_is_one_of_five_or_none(string? circle, ContactCircle? kept) =>
        Assert.Equal(kept, SaveContactValidator.Validate(Request() with { Circle = circle }).Details.Circle);

    [Theory]
    [InlineData("family")]
    [InlineData("Colleagues")]
    [InlineData("3")]
    public void Any_other_circle_is_refused(string circle) =>
        AssertRefused(Request() with { Circle = circle }, "contact_circle_not_allowed", "circle");

    private static SaveContactRequest Request() =>
        new(Guid.NewGuid(), "Femi Bankole", null, null, null, null, null, []);

    /// <summary>A number stands for a text of that many characters.</summary>
    private static string? Text(object? given) => given is int length ? new string('a', length) : (string?)given;

    private static void AssertRefused(SaveContactRequest request, string code, string field)
    {
        var problem = Assert.Throws<ProblemException>(() => SaveContactValidator.Validate(request));
        Assert.Equal((400, code, field), (problem.Status, problem.Code, problem.Field));
    }
}
