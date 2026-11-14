using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Popkins;

/// <summary>
/// The rules a Popkin's name, look and length keep, whether it is being started (L2-008, L2-009)
/// or changed by its Host (L2-020 AC3, AC4). Each returns the value it checked, or refuses it
/// with 400 and the field's `code`.
/// </summary>
public static class PopkinInput
{
    public static string Name(string? name)
    {
        var trimmed = (name ?? "").Trim();
        if (trimmed.Length == 0)
        {
            throw ProblemException.Invalid("name_required", "Give your Popkin a name.", "name");
        }

        return trimmed.Length > PopkinRules.MaxNameLength
            ? throw ProblemException.Invalid("name_too_long", "A name is at most 40 characters.", "name")
            : trimmed;
    }

    public static string Emoji(string? emoji) =>
        emoji is not null && PopkinRules.Emoji.Contains(emoji)
            ? emoji
            : throw ProblemException.Invalid("emoji_not_allowed", "Pick one of the twelve emoji.", "emoji");

    public static PopkinColour Colour(string? colour) =>
        Named<PopkinColour>(colour) ?? throw ProblemException.Invalid("colour_not_allowed", "Pick one of the seven colours.", "colour");

    public static PopkinLength Length(string? length) =>
        Named<PopkinLength>(length) ?? throw ProblemException.Invalid("length_not_allowed", "Pick how long it lasts.", "length");

    /// <summary>
    /// The end the device resolved for the length chosen (L2-009 AC3): none to keep it going, a
    /// chosen date at least an hour away, and never a year or more away.
    /// </summary>
    public static DateTimeOffset? End(PopkinLength length, DateTimeOffset? endsAt, DateTimeOffset now)
    {
        var allowed = length switch
        {
            PopkinLength.KeepItGoing => endsAt is null,
            PopkinLength.UntilDate => endsAt is { } end && end - now >= PopkinRules.MinimumLength && end - now <= PopkinRules.MaximumLength,
            _ => endsAt is { } end && end > now && end - now <= PopkinRules.MaximumLength,
        };
        return allowed
            ? endsAt
            : throw ProblemException.Invalid("ends_at_out_of_range", "Pick a time at least an hour from now and less than a year away.", "endsAt");
    }

    /// <summary>A value of the enum by its name; never by its number.</summary>
    private static T? Named<T>(string? value)
        where T : struct, Enum =>
        Enum.TryParse<T>(value, ignoreCase: false, out var parsed) && Enum.IsDefined(parsed) && !int.TryParse(value, out _)
            ? parsed
            : null;
}
