namespace Popkin.Domain;

/// <summary>The rules a Popkin's name, look and length keep (L2-008, L2-009 AC3).</summary>
public static class PopkinRules
{
    public const int MaxNameLength = 40;
    public const int MinInviteCodeLength = 8;
    public static readonly TimeSpan MinimumLength = TimeSpan.FromHours(1);
    public static readonly TimeSpan MaximumLength = TimeSpan.FromDays(365);

    /// <summary>The twelve emoji a Popkin can take.</summary>
    public static readonly IReadOnlyList<string> Emoji =
        ["🏕️", "🙏", "☕", "💻", "⚽", "🎸", "🌻", "🏖️", "🍲", "🧶", "📚", "🎉"];
}
