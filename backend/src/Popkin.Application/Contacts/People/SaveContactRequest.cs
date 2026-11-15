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
    IReadOnlyList<string>? Loves);

/// <summary>The rules of the contact form, for add and edit alike (L2-129 AC4).</summary>
public static class SaveContactValidator
{
    /// <summary>The trimmed name and the details, or the refusal of the first rule broken.</summary>
    public static (string Name, ContactDetails Details) Validate(SaveContactRequest request)
    {
        var name = request.Name?.Trim();
        if (string.IsNullOrEmpty(name))
        {
            throw ProblemException.Invalid("contact_name_required", "Add a name so you can find them later.", "name");
        }

        return (name, new ContactDetails(
            request.KnownAs, CircleOf(request.Circle), request.Phone, request.Email, request.City, request.Loves ?? []));
    }

    /// <summary>One of Family, Friends, Work, Neighbours and Clubs, or none.</summary>
    private static ContactCircle? CircleOf(string? circle) =>
        string.IsNullOrWhiteSpace(circle) ? null
        : Enum.TryParse<ContactCircle>(circle, ignoreCase: false, out var parsed) && Enum.IsDefined(parsed) ? parsed
        : throw ProblemException.Invalid(
            "contact_circle_not_allowed", "A circle is Family, Friends, Work, Neighbours or Clubs.", "circle");
}
