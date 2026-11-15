namespace Popkin.Domain;

/// <summary>A feature an Owner switches in the admin app (L1-019). Phone sign-in is a setting instead (ADR 0023).</summary>
public enum Feature
{
    Plan,
    Schedules,
}

/// <summary>Who has a feature: nobody, the chosen Popkins only, or every Popkin (L2-076).</summary>
public enum FeatureMode
{
    Off,
    Chosen,
    Everyone,
}

/// <summary>
/// The switch of one feature and who last set it (L2-076 AC1). A feature without a row is off,
/// the safe answer (ADR 0024). Switching never deletes a feature's data (L2-077 AC5).
/// </summary>
public sealed class FeatureSetting
{
    private FeatureSetting()
    {
    }

    public Feature Feature { get; private set; }

    public FeatureMode Mode { get; private set; }

    public DateTimeOffset ChangedAt { get; private set; }

    /// <summary>The admin who set it; null when Popkin set it itself, as the seed does.</summary>
    public Guid? ChangedByAdminId { get; private set; }

    public string ChangedByName { get; private set; } = "";

    public static FeatureSetting Start(Feature feature, FeatureMode mode, Guid? adminId, string adminName, DateTimeOffset now) =>
        new() { Feature = feature, Mode = mode, ChangedByAdminId = adminId, ChangedByName = adminName, ChangedAt = now };

    public void ChangeMode(FeatureMode mode, Guid? adminId, string adminName, DateTimeOffset now)
    {
        Mode = mode;
        ChangedByAdminId = adminId;
        ChangedByName = adminName;
        ChangedAt = now;
    }
}

/// <summary>
/// A feature the Host switched off for their Popkin (L2-152, L2-153). A Popkin without one has
/// the feature whenever the admin app offers it (ADR 0026); switching off deletes no data.
/// </summary>
public sealed class PopkinFeatureOff
{
    private PopkinFeatureOff()
    {
    }

    public Guid PopkinId { get; private set; }

    public Feature Feature { get; private set; }

    public DateTimeOffset SwitchedOffAt { get; private set; }

    public static PopkinFeatureOff SwitchOff(Guid popkinId, Feature feature, DateTimeOffset now) =>
        new() { PopkinId = popkinId, Feature = feature, SwitchedOffAt = now };
}

/// <summary>
/// A live Popkin named on a feature's switch, which has the feature while the mode is Chosen
/// (L2-076 AC5). Kept whatever the mode, so moving to Everyone and back keeps the list.
/// </summary>
public sealed class FeatureChosenPopkin
{
    private FeatureChosenPopkin()
    {
    }

    public Feature Feature { get; private set; }

    public Guid PopkinId { get; private set; }

    public DateTimeOffset AddedAt { get; private set; }

    public Guid AddedByAdminId { get; private set; }

    public static FeatureChosenPopkin Choose(Feature feature, Guid popkinId, Guid adminId, DateTimeOffset now) =>
        new() { Feature = feature, PopkinId = popkinId, AddedByAdminId = adminId, AddedAt = now };
}
