using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Abstractions;

/// <summary>
/// Whether a feature is on for a Popkin (L2-077): offered by the admin app and switched on by its
/// Host (ADR 0026). Answered from the platform snapshot, which the API refreshes from the
/// database, so a changed switch needs no release (ADR 0024).
/// </summary>
public interface IFeatureSwitches
{
    /// <summary>The admin app's answer: true for Everyone, false for Off, and for Chosen true only for a chosen Popkin (L2-077 AC7).</summary>
    bool IsOffered(Feature feature, Guid popkinId);

    /// <summary>Whether a Popkin not yet created is offered the feature: on for Everyone (L2-152 AC8).</summary>
    bool IsOfferedToNew(Feature feature);

    /// <summary>Whether the Host has the feature switched off for their Popkin (L2-152, L2-153).</summary>
    bool IsSwitchedOffByHost(Feature feature, Guid popkinId);

    /// <summary>Offered and switched on by the Host (ADR 0026).</summary>
    bool IsOn(Feature feature, Guid popkinId) => IsOffered(feature, popkinId) && !IsSwitchedOffByHost(feature, popkinId);

    /// <summary>
    /// Refuses with 404 `feature_off` while the feature is off for the Popkin (L2-077 AC3), saying
    /// who switched it off: `Popkin` (the admin app) or `Host` (L2-077 AC2).
    /// </summary>
    void Require(Feature feature, Guid popkinId)
    {
        if (!IsOffered(feature, popkinId))
        {
            throw FeatureOff(feature, "Popkin");
        }

        if (IsSwitchedOffByHost(feature, popkinId))
        {
            throw FeatureOff(feature, "Host");
        }
    }

    static ProblemException FeatureOff(Feature feature, string switchedOffBy = "Popkin")
    {
        var problem = new ProblemException(404, "feature_off", $"{feature} is switched off.");
        problem.Extensions["switchedOffBy"] = switchedOffBy;
        return problem;
    }
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
