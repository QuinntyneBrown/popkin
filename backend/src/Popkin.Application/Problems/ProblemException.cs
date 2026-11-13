namespace Popkin.Application.Problems;

/// <summary>
/// A refusal the client can branch on. The API turns it into ProblemDetails with a `code`
/// extension, a `field` extension when set and `Retry-After` for 429 (L2-052 AC1).
/// </summary>
public class ProblemException(int status, string code, string title, string? field = null, TimeSpan? retryAfter = null)
    : Exception(title)
{
    public int Status { get; } = status;

    public string Code { get; } = code;

    public string Title { get; } = title;

    public string? Field { get; } = field;

    public TimeSpan? RetryAfter { get; } = retryAfter;

    /// <summary>Extra extensions, such as `attemptsLeft`.</summary>
    public IDictionary<string, object?> Extensions { get; } = new Dictionary<string, object?>();

    public static ProblemException Invalid(string code, string title, string field) => new(400, code, title, field);
}
