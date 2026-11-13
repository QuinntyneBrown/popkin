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

    /// <summary>When the personal data of a deleted account was erased (L2-049 AC4).</summary>
    public DateTimeOffset? ErasedAt { get; private set; }

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

    /// <summary>
    /// The person deleted their account (L2-049 AC4). Nothing signs in as them any more, and
    /// their phone number or email may sign up again at once.
    /// </summary>
    public void MarkDeleted(DateTimeOffset now) => DeletedAt ??= now;

    /// <summary>
    /// Erases what identifies a deleted person: their name, phone number, email and photo. The
    /// photo's file is the caller's to delete. The row stays, so what they shared keeps its author.
    /// </summary>
    public void Erase(DateTimeOffset now)
    {
        Name = "";
        Phone = null;
        Email = null;
        PhotoKey = null;
        ErasedAt ??= now;
    }

    /// <summary>A new photo, already stored under `photoKey` (L2-048 AC2).</summary>
    public void ChangePhoto(string photoKey) => PhotoKey = photoKey;
}
