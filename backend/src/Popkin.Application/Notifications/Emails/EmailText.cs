using System.Globalization;
using System.Text;
using Popkin.Domain;

namespace Popkin.Application.Notifications.Emails;

/// <summary>Members' words as an email shows them (L2-163 AC1, AC7).</summary>
public static class EmailText
{
    public const int MaxText = 300;

    public const int MaxPreheader = 90;

    /// <summary>The text cut to `max` characters by whole grapheme clusters, ending "…" when cut.</summary>
    public static string Cut(string text, int max)
    {
        if (text.Length <= max)
        {
            return text;
        }

        var kept = new StringBuilder();
        var graphemes = StringInfo.GetTextElementEnumerator(text);
        while (graphemes.MoveNext())
        {
            var grapheme = graphemes.GetTextElement();
            // A grapheme that starts within the limit is kept whole, so an emoji is never split.
            if (kept.Length >= max)
            {
                return kept + "…";
            }

            kept.Append(grapheme);
        }

        return kept.ToString();
    }

    /// <summary>The hidden first line a mail client previews: one line, 90 characters at most.</summary>
    public static string Preheader(string text) =>
        Cut(string.Join(' ', text.Split((char[])['\r', '\n'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)), MaxPreheader);

    public static string FirstName(string displayName) => PersonName.FirstName(displayName);
}
