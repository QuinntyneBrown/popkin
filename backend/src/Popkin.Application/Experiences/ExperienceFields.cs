using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Experiences;

/// <summary>
/// The rules the text of an experience keeps, for sharing and for editing (L2-040 AC2, AC3).
/// Each text is kept as typed, less the white space around it; it is never markup (L2-052 AC2).
/// A refusal is 400 with a `code` and names its field (L2-052 AC1).
/// </summary>
public static class ExperienceFields
{
    public static string Title(string? title)
    {
        var text = (title ?? "").Trim();
        if (text.Length == 0)
        {
            throw ProblemException.Invalid("title_required", "Give it a name.", "title");
        }

        return text.Length <= Experience.MaxTitleLength
            ? text
            : throw ProblemException.Invalid("title_too_long", "A title is at most 80 characters.", "title");
    }

    public static ExperienceKind Kind(string? kind) => kind switch
    {
        nameof(ExperienceKind.Did) => ExperienceKind.Did,
        nameof(ExperienceKind.Restaurant) => ExperienceKind.Restaurant,
        nameof(ExperienceKind.Want) => ExperienceKind.Want,
        _ => throw ProblemException.Invalid("invalid_kind", "Choose a kind.", "kind"),
    };

    public static string? When(string? when) =>
        Optional(when, Experience.MaxWhenLength, "when_too_long", "A when is at most 40 characters.", "when");

    public static string? Place(string? place) =>
        Optional(place, Experience.MaxPlaceLength, "place_too_long", "A place is at most 80 characters.", "place");

    private static string? Optional(string? given, int maxLength, string code, string title, string field)
    {
        var text = (given ?? "").Trim();
        if (text.Length > maxLength)
        {
            throw ProblemException.Invalid(code, title, field);
        }

        return text.Length == 0 ? null : text;
    }
}
