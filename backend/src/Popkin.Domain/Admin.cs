namespace Popkin.Domain;

/// <summary>
/// A person who runs Popkin from the admin app (L1-028). An admin is not a <see cref="Person"/>:
/// inside the Popkin app an admin is an ordinary person (ADR 0024). Staff emails end in
/// `@popkin.app`; the first Owner is named by configuration (L2-078 AC1).
/// </summary>
public sealed class Admin
{
    public const string StaffDomain = "@popkin.app";

    private Admin()
    {
    }

    public Guid Id { get; private set; }

    /// <summary>The staff email, normalised to lower case; unique.</summary>
    public string Email { get; private set; } = "";

    /// <summary>The email's local part until an admin is given a name (known gap 87).</summary>
    public string Name { get; private set; } = "";

    public AdminRole Role { get; private set; }

    public DateTimeOffset InvitedAt { get; private set; }

    public Guid? InvitedByAdminId { get; private set; }

    /// <summary>When the admin first signed in; until then they are listed as invited (L2-119 AC4).</summary>
    public DateTimeOffset? ActivatedAt { get; private set; }

    public DateTimeOffset? LastActiveAt { get; private set; }

    public DateTimeOffset? RemovedAt { get; private set; }

    public bool IsRemoved => RemovedAt is not null;

    /// <summary>Added but not signed in yet (L2-119 AC4).</summary>
    public bool IsInvited => ActivatedAt is null;

    public static Admin Invite(string email, AdminRole role, Guid? invitedBy, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        Email = email,
        Name = NameFrom(email),
        Role = role,
        InvitedAt = now,
        InvitedByAdminId = invitedBy,
    };

    public static bool IsStaffEmail(string email) => email.EndsWith(StaffDomain, StringComparison.Ordinal) && email.Length > StaffDomain.Length;

    public void SignedIn(DateTimeOffset now)
    {
        ActivatedAt ??= now;
        LastActiveAt = now;
    }

    /// <summary>Records activity at most once a minute, so a page view is not a write.</summary>
    public bool Seen(DateTimeOffset now)
    {
        if (LastActiveAt is { } last && now - last < TimeSpan.FromMinutes(1))
        {
            return false;
        }

        LastActiveAt = now;
        return true;
    }

    /// <summary>A removed admin added again keeps one record and one history (L2-119 AC2).</summary>
    public void Reinvite(AdminRole role, Guid? invitedBy, DateTimeOffset now)
    {
        Role = role;
        InvitedAt = now;
        InvitedByAdminId = invitedBy;
        ActivatedAt = null;
        LastActiveAt = null;
        RemovedAt = null;
    }

    public void ChangeRole(AdminRole role) => Role = role;

    public void Remove(DateTimeOffset now) => RemovedAt ??= now;

    private static string NameFrom(string email)
    {
        var local = email.Split('@')[0];
        var words = local.Split(['.', '_', '-'], StringSplitOptions.RemoveEmptyEntries);
        return words.Length == 0 ? local : string.Join(' ', words.Select(w => char.ToUpperInvariant(w[0]) + w[1..]));
    }
}
