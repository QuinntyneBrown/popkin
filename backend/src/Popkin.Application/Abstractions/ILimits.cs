using Popkin.Domain;

namespace Popkin.Application.Abstractions;

/// <summary>
/// The limits an Owner sets on Limits, each its default until changed (L2-117, L2-176). Answered
/// synchronously from the platform snapshot, refreshed at most 30 seconds after a change.
/// </summary>
public interface ILimits
{
    int Get(LimitKey limit);

    /// <summary>How long a sign-in lasts after its last use (L2-176).</summary>
    TimeSpan SessionLength => TimeSpan.FromDays(Get(LimitKey.SessionDays));
}
