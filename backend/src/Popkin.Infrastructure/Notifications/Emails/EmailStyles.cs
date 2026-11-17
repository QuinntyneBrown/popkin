namespace Popkin.Infrastructure.Notifications.Emails;

/// <summary>
/// The light theme's tokens as inline styles: mail clients ignore style sheets unevenly, so every
/// element carries its own (ADR 0031). Values from docs/design-system/tokens/tokens.css; text
/// colours meet WCAG 2.2 AA on their backgrounds (L2-163 AC4).
/// </summary>
internal static class EmailStyles
{
    public const string Font = "font-family:Inter,system-ui,-apple-system,'Segoe UI',sans-serif;";
    public const string Canvas = "#f4f4f1";
    public const string Surface = "#ffffff";
    public const string Ink = "#000000";
    public const string InkSoft = "#3b3b3b";
    public const string InkFaint = "#6b6b6b";
    public const string Line = "#e4e4e0";
    public const string Link = "#b4403b";
    public const string Accent = "#ea7671";

    /// <summary>A Popkin's colour (`--palette-accent-*`), for its tile.</summary>
    public static string Of(string colour) => colour switch
    {
        "Teal" => "#5c8f57",
        "Sky" => "#7fa6d6",
        "Berry" => "#e08aa8",
        "Leaf" => "#9dbb8a",
        "Plum" => "#a98bd3",
        "Amber" => "#dcc573",
        _ => "#ea7671",
    };
}
