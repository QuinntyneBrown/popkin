using Popkin.Application.Problems;

namespace Popkin.Application.Abstractions;

/// <summary>A feature an owner switches on and off for every Popkin at once (L1-019).</summary>
public enum Feature
{
    Schedules,
    Plan,
}

/// <summary>
/// Whether a feature is on (L2-077). Read at each call, so a changed switch needs no release
/// (ADR 0023). Journey 23 keeps the switches in the admin app behind this same interface.
/// </summary>
public interface IFeatureSwitches
{
    bool IsOn(Feature feature);

    /// <summary>Refuses with 404 `feature_off` while the feature is off (L2-077 AC3).</summary>
    void Require(Feature feature)
    {
        if (!IsOn(feature))
        {
            throw FeatureOff(feature);
        }
    }

    static ProblemException FeatureOff(Feature feature) => new(404, "feature_off", $"{feature} is switched off.");
}
