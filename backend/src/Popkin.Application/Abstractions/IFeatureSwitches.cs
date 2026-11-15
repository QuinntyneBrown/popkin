using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Abstractions;

/// <summary>
/// Whether a feature is on for a Popkin (L2-077). Answered from the platform snapshot, which the
/// API refreshes from the database, so a changed switch needs no release (ADR 0024).
/// </summary>
public interface IFeatureSwitches
{
    /// <summary>True for Everyone, false for Off, and for Chosen true only for a chosen Popkin (L2-077 AC7).</summary>
    bool IsOn(Feature feature, Guid popkinId);

    /// <summary>Refuses with 404 `feature_off` while the feature is off for the Popkin (L2-077 AC3).</summary>
    void Require(Feature feature, Guid popkinId)
    {
        if (!IsOn(feature, popkinId))
        {
            throw FeatureOff(feature);
        }
    }

    static ProblemException FeatureOff(Feature feature) => new(404, "feature_off", $"{feature} is switched off.");
}

/// <summary>
/// The switches (and, later, the limits) the API holds in memory. Refreshed at most every 30
/// seconds, and at the next request after a change made through this API (L2-076 AC10).
/// </summary>
public interface IPlatformSnapshot
{
    Task RefreshIfStaleAsync(CancellationToken cancellationToken);

    /// <summary>Marks the snapshot stale, so the next request reads the database again.</summary>
    void Invalidate();
}
