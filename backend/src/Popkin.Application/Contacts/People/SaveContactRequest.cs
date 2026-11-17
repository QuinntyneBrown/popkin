using System.Text.RegularExpressions;
using Popkin.Application.Contacts.Connections;
using Popkin.Application.Contacts.Dates;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Contacts.People;

/// <summary>
/// The part `contact` of Add someone and Edit (L2-129, L2-130): who they are and their details,
/// sent under the client id the web app gave this save.
/// </summary>
public sealed record SaveContactRequest(
    Guid ClientId,
    string? Name,
    string? KnownAs,
    string? Circle,
    string? Phone,
    string? Email,
    string? City,
    string? HowWeMet,
    IReadOnlyList<string>? Loves,
    IReadOnlyList<KeyDateDraftDto>? KeyDates = null,
    IReadOnlyList<ConnectionDraftDto>? Connect = null,
    IReadOnlyList<Guid>? Disconnect = null);

/// <summary>
/// The rules of the contact form, for add and edit alike (L2-129 AC4), with the limits on
/// <see cref="Contact"/> (known gap 102). Every text is kept as typed, less the white space
/// around it. A refusal is 400 with a `code` and names its field.
/// </summary>
public static partial class SaveContactValidator
{
    /// <summary>The trimmed name and the details, or the refusal of the first rule broken.</summary>
    public static (string Name, ContactDetails Details) Validate(SaveContactRequest request)
    {
        var name = request.Name?.Trim();
        if (string.IsNullOrEmpty(name))
        {
            throw ProblemException.Invalid("contact_name_required", "Add a name so you can find them later.", "name");
        }

        return (Limited(name, Contact.MaxNameLength, "name")!, new ContactDetails(
            Limited(request.KnownAs, Contact.MaxKnownAsLength, "knownAs"),
            CircleOf(request.Circle),
            PhoneOf(request.Phone),
            EmailOf(request.Email),
            Limited(request.City, Contact.MaxCityLength, "city"),
            Limited(request.HowWeMet, Contact.MaxHowWeMetLength, "howWeMet"),
            LovesOf(request.Loves ?? [])));
    }

    /// <summary>One of Family, Friends, Work, Neighbours and Clubs by name, or none.</summary>
    private static ContactCircle? CircleOf(string? circle) =>
        string.IsNullOrWhiteSpace(circle) ? null
        : Enum.GetNames<ContactCircle>().Contains(circle) ? Enum.Parse<ContactCircle>(circle)
        : throw ProblemException.Invalid(
            "contact_circle_not_allowed", "A circle is Family, Friends, Work, Neighbours or Clubs.", "circle");

    /// <summary>
    /// A number as it is typed, wherever they live: 7 to 15 digits (as E.164 allows), with
    /// spaces, a leading +, brackets, dashes and dots.
    /// </summary>
    private static string? PhoneOf(string? phone)
    {
        var text = Trimmed(phone);
        if (text is null)
        {
            return null;
        }

        var digits = text.Count(char.IsAsciiDigit);
        return text.Length <= Contact.MaxPhoneLength && digits is >= 7 and <= 15 && Phone().IsMatch(text)
            ? text
            : throw ProblemException.Invalid("contact_phone_invalid", "That number doesn't look quite right.", "phone");
    }

    private static string? EmailOf(string? email)
    {
        var text = Trimmed(email);
        return text is null || (text.Length <= Contact.MaxEmailLength && Email().IsMatch(text))
            ? text
            : throw ProblemException.Invalid("contact_email_invalid", "That email doesn't look quite right.", "email");
    }

    /// <summary>The things they love, less the blank ones: at most 12, each at most 40 characters.</summary>
    private static List<string> LovesOf(IReadOnlyList<string> loves)
    {
        var kept = loves.Select(Trimmed).OfType<string>().ToList();
        return kept.Count <= Contact.MaxLoves && kept.All(l => l.Length <= Contact.MaxLoveLength)
            ? kept
            : throw TooLong("loves");
    }

    private static string? Limited(string? value, int maxLength, string field)
    {
        var text = Trimmed(value);
        return text is null || text.Length <= maxLength ? text : throw TooLong(field);
    }

    private static string? Trimmed(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static ProblemException TooLong(string field) =>
        ProblemException.Invalid("contact_field_too_long", "That is longer than Contacts keeps.", field);

    [GeneratedRegex(@"^\+?[0-9 ().\-]+$")]
    private static partial Regex Phone();

    [GeneratedRegex(@"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")]
    private static partial Regex Email();
}
