namespace Popkin.Domain;

/// <summary>Someone with an account. They prove who they are with a code, never a password.</summary>
public sealed class Person
{
    public const int MaxNameLength = 40;

    private Person()
    {
    }

    public Guid Id { get; private set; }

    public string Name { get; private set; } = "";

    /// <summary>The photo store key of the account's photo; null shows the initials (L2-048 AC1).</summary>
    public string? PhotoKey { get; private set; }

    /// <summary>The phone number in E.164 form, when the person signed up with one.</summary>
    public string? Phone { get; private set; }

    /// <summary>The email in trimmed lower case, when the person signed up with one.</summary>
    public string? Email { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public DateTimeOffset? DeletedAt { get; private set; }

    public static Person Create(string name, ContactChannel channel, string destination, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        Name = name,
        Phone = channel == ContactChannel.Phone ? destination : null,
        Email = channel == ContactChannel.Email ? destination : null,
        CreatedAt = now,
    };

    /// <summary>A new name of 1 to 40 characters, already trimmed (L2-048 AC2).</summary>
    public void Rename(string name) => Name = name;

    /// <summary>A new photo, already stored under `photoKey` (L2-048 AC2).</summary>
    public void ChangePhoto(string photoKey) => PhotoKey = photoKey;
}
