using Popkin.Application.Problems;

namespace Popkin.Application.Administration;

/// <summary>
/// The reason an admin gives for a change, kept in the audit log (L2-087). Trimmed; at most 500
/// characters, counted as the browser's `maxlength` counts them (L2-087 AC6).
/// </summary>
public static class ReasonRules
{
    public const int MaxLength = 500;

    /// <summary>A reason the change needs (L2-087 AC1, AC2).</summary>
    public static string Required(string? reason) =>
        Optional(reason) ?? throw ProblemException.Invalid("reason_required", "Give a reason; it goes in the audit log.", "reason");

    /// <summary>A reason the change may go without (L2-087 AC3): null when blank.</summary>
    public static string? Optional(string? reason)
    {
        var trimmed = reason?.Trim();
        if (string.IsNullOrEmpty(trimmed))
        {
            return null;
        }

        return trimmed.Length > MaxLength
            ? throw ProblemException.Invalid("reason_too_long", "Keep the reason to 500 characters.", "reason")
            : trimmed;
    }
}
