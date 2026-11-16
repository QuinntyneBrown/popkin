namespace Popkin.Domain;

/// <summary>The kind of tie an owner has with a contact (L2-129 AC1).</summary>
public enum ContactCircle
{
    Family,
    Friends,
    Work,
    Neighbours,
    Clubs,
}

/// <summary>What the owner writes in "Who" and "Details" of the contact form (L2-129 AC1).</summary>
public sealed record ContactDetails(
    string? KnownAs, ContactCircle? Circle, string? Phone, string? Email, string? City, IReadOnlyList<string> Loves);

/// <summary>
/// Someone a person keeps in their Contacts, whether or not they have a Popkin account (L1-031).
/// Only its owner sees it, and nobody is told it exists (L2-122).
/// </summary>
public sealed class Contact : IClientWrite
{
    // The limits of the contact form: the interim ruling of known gap 102. A name is as long as
    // a person's may be.
    public const int MaxNameLength = Person.MaxNameLength;

    public const int MaxKnownAsLength = 60;

    public const int MaxCityLength = 60;

    public const int MaxPhoneLength = 20;

    public const int MaxEmailLength = 254;

    public const int MaxLoves = 12;

    public const int MaxLoveLength = 40;

    private Contact()
    {
    }

    public Guid Id { get; private set; }

    public Guid OwnerId { get; private set; }

    public Guid ClientId { get; private set; }

    public string Name { get; private set; } = "";

    public string? KnownAs { get; private set; }

    public ContactCircle? Circle { get; private set; }

    public string? Phone { get; private set; }

    public string? Email { get; private set; }

    public string? City { get; private set; }

    public List<string> Loves { get; private set; } = [];

    public string? PhotoKey { get; private set; }

    public bool IsClosest { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>A new contact; the name is trimmed, as every field is.</summary>
    public static Contact Create(Guid ownerId, Guid clientId, string name, ContactDetails details, DateTimeOffset now)
    {
        var contact = new Contact
        {
            Id = Guid.NewGuid(),
            OwnerId = ownerId,
            ClientId = clientId,
            Name = name.Trim(),
            CreatedAt = now,
        };
        contact.ChangeDetails(details);
        return contact;
    }

    public void Rename(string name) => Name = name.Trim();

    public void ChangeDetails(ContactDetails details)
    {
        KnownAs = Clean(details.KnownAs);
        Circle = details.Circle;
        Phone = Clean(details.Phone);
        Email = Clean(details.Email);
        City = Clean(details.City);
        Loves = details.Loves.Select(l => l.Trim()).Where(l => l.Length > 0).ToList();
    }

    public void ChangePhoto(string key) => PhotoKey = key;

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
