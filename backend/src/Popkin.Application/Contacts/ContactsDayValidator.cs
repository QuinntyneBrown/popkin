using System.Globalization;
using Popkin.Application.Problems;

namespace Popkin.Application.Contacts;

/// <summary>
/// The device's day a Contacts read is for (`?on=yyyy-MM-dd`): what is near, late or drifting
/// depends on it, so the web app and the API agree on "today". Anything else is 400 `invalid_date`.
/// </summary>
public static class ContactsDayValidator
{
    public static DateOnly Parse(string? on) =>
        DateOnly.TryParseExact(on, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var day)
            ? day
            : throw ProblemException.Invalid("invalid_date", "That isn't a day.", "on");
}
