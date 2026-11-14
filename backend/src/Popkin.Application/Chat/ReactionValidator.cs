using System.Globalization;
using System.Text;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Chat;

/// <summary>
/// A reaction is one emoji (L2-024, L2-052 AC1): one extended grapheme cluster of at most 32
/// UTF-16 units, made of pictographic code points and the parts emoji are built with (the
/// joiner, the emoji variation selector, skin tones, keycaps, regional indicators and tags).
/// Anything else is 400 `reaction_invalid`.
/// </summary>
public static class ReactionValidator
{
    private const int ZeroWidthJoiner = 0x200D;
    private const int EmojiPresentation = 0xFE0F;
    private const int CombiningKeycap = 0x20E3;

    /// <summary>The emoji as given, when it is one; otherwise 400 `reaction_invalid` naming `emoji`.</summary>
    public static string Require(string? emoji) =>
        IsEmoji(emoji) ? emoji! : throw ProblemException.Invalid("reaction_invalid", "A reaction is one emoji.", "emoji");

    /// <summary>Whether the text is one emoji, as a reaction to a message or to a photo must be.</summary>
    public static bool IsEmoji(string? emoji)
    {
        if (string.IsNullOrEmpty(emoji) || emoji.Length > MessageReaction.MaxEmojiLength || !emoji.IsNormalized(NormalizationForm.FormC))
        {
            return false;
        }

        if (new StringInfo(emoji).LengthInTextElements != 1)
        {
            return false;
        }

        var runes = emoji.EnumerateRunes().Select(r => r.Value).ToList();

        // A keycap: a digit, # or *, the variation selector if any, then the keycap.
        if (IsKeycapBase(runes[0]))
        {
            return runes.Count is 2 or 3 && runes[^1] == CombiningKeycap && (runes.Count == 2 || runes[1] == EmojiPresentation);
        }

        return runes.Any(r => IsPictographic(r) || IsRegionalIndicator(r)) && runes.All(IsEmojiPart);
    }

    private static bool IsKeycapBase(int rune) => rune is >= '0' and <= '9' or '#' or '*';

    private static bool IsRegionalIndicator(int rune) => rune is >= 0x1F1E6 and <= 0x1F1FF;

    private static bool IsEmojiPart(int rune) =>
        IsPictographic(rune)
        || IsRegionalIndicator(rune)
        || rune is ZeroWidthJoiner or EmojiPresentation
        || rune is >= 0x1F3FB and <= 0x1F3FF // skin tones
        || rune is >= 0xE0020 and <= 0xE007F; // tags of a subdivision flag

    /// <summary>The blocks and code points of Unicode's Extended_Pictographic property, by range.</summary>
    private static bool IsPictographic(int rune) =>
        rune is 0x00A9 or 0x00AE or 0x203C or 0x2049 or 0x2122 or 0x2139 or 0x2328 or 0x23CF or 0x24C2
            or 0x25B6 or 0x25C0 or 0x2B50 or 0x2B55 or 0x3030 or 0x303D or 0x3297 or 0x3299
        || rune is >= 0x2194 and <= 0x2199
        || rune is >= 0x21A9 and <= 0x21AA
        || rune is >= 0x231A and <= 0x231B
        || rune is >= 0x23E9 and <= 0x23F3
        || rune is >= 0x23F8 and <= 0x23FA
        || rune is >= 0x25AA and <= 0x25AB
        || rune is >= 0x25FB and <= 0x25FE
        || rune is >= 0x2600 and <= 0x27BF // miscellaneous symbols and dingbats
        || rune is >= 0x2934 and <= 0x2935
        || rune is >= 0x2B05 and <= 0x2B07
        || rune is >= 0x2B1B and <= 0x2B1C
        || rune is >= 0x1F000 and <= 0x1F0FF // mahjong, dominoes and playing cards
        || rune is >= 0x1F10D and <= 0x1F1AD // enclosed alphanumeric supplement, less the regional indicators
        || rune is >= 0x1F201 and <= 0x1F2FF
        || rune is >= 0x1F300 and <= 0x1F3FA // pictographs, less the skin tones
        || rune is >= 0x1F400 and <= 0x1FAFF // pictographs, emoticons, transport, supplemental symbols
        || rune is >= 0x1FC00 and <= 0x1FFFD;
}
