namespace Popkin.Domain;

/// <summary>What Popkin shows of a name: its initials on an avatar, and its first word.</summary>
public static class PersonName
{
    /// <summary>
    /// What a member whose account was deleted is shown as, in every Popkin they were in
    /// (L2-049 AC1). It is shown whole, never cut to its first word.
    /// </summary>
    public const string FormerMember = "Former member";

    /// <summary>The first letters of the first and the last word, in upper case: "Mara Okafor" is "MO", "Joel" is "J".</summary>
    public static string Initials(string name)
    {
        var words = name.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
        return words.Length switch
        {
            0 => "",
            1 => First(words[0]),
            _ => First(words[0]) + First(words[^1]),
        };
    }

    /// <summary>The first word of a name: "Mara Okafor" is "Mara".</summary>
    public static string FirstName(string name)
    {
        if (name == FormerMember)
        {
            return name;
        }

        var words = name.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
        return words.Length == 0 ? "" : words[0];
    }

    private static string First(string word) =>
        System.Globalization.StringInfo.GetNextTextElement(word).ToUpperInvariant();
}
