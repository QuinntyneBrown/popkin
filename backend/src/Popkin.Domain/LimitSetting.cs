namespace Popkin.Domain;

/// <summary>
/// A limit an Owner changed and who changed it last (L2-117 AC2, L2-176). A limit without a row
/// holds its default (<see cref="LimitDefaults"/>).
/// </summary>
public sealed class LimitSetting
{
    private LimitSetting()
    {
    }

    public LimitKey Limit { get; private set; }

    public int Value { get; private set; }

    public DateTimeOffset ChangedAt { get; private set; }

    public Guid ChangedByAdminId { get; private set; }

    public string ChangedByName { get; private set; } = "";

    public static LimitSetting Start(LimitKey limit, int value, Guid adminId, string adminName, DateTimeOffset now) =>
        new() { Limit = limit, Value = value, ChangedByAdminId = adminId, ChangedByName = adminName, ChangedAt = now };

    public void Change(int value, Guid adminId, string adminName, DateTimeOffset now)
    {
        Value = value;
        ChangedByAdminId = adminId;
        ChangedByName = adminName;
        ChangedAt = now;
    }
}
