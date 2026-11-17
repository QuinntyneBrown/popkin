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
    string? KnownAs, ContactCircle? Circle, string? Phone, string? Email, string? City, string? HowWeMet, IReadOnlyList<string> Loves);

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

    public const int MaxHowWeMetLength = 120;

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

    public string? HowWeMet { get; private set; }

    public List<string> Loves { get; private set; } = [];

    public string? PhotoKey { get; private set; }

    public bool IsClosest { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>
    /// The account the contact was imported from (L2-151), or null for one added by hand; cleared
    /// when that account is erased, so "Also in your Popkin" no longer shows (known gap 117).
    /// </summary>
    public Guid? PersonId { get; private set; }

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

    /// <summary>
    /// A contact made by Import from someone the owner shares a Popkin with: their name and nothing
    /// else, linked to their account (L2-151, known gap 110).
    /// </summary>
    public static Contact Import(Guid ownerId, Guid personId, string name, DateTimeOffset now)
    {
        var contact = Create(ownerId, Guid.NewGuid(), name, new ContactDetails(null, null, null, null, null, null, []), now);
        contact.PersonId = personId;
        return contact;
    }

    /// <summary>The account it was imported from is erased: the link goes, the contact stays.</summary>
    public void ForgetPerson() => PersonId = null;

    public void Rename(string name) => Name = name.Trim();

    public void ChangeDetails(ContactDetails details)
    {
        KnownAs = Clean(details.KnownAs);
        Circle = details.Circle;
        Phone = Clean(details.Phone);
        Email = Clean(details.Email);
        City = Clean(details.City);
        HowWeMet = Clean(details.HowWeMet);
        Loves = details.Loves.Select(l => l.Trim()).Where(l => l.Length > 0).ToList();
    }

    public void ChangePhoto(string key) => PhotoKey = key;

    /// <summary>Into Closest, the owner's short list (L2-131 AC4); the circle stays as it is.</summary>
    public void JoinClosest() => IsClosest = true;

    /// <summary>Out of Closest (L2-131 AC2); they stay in People and their circle.</summary>
    public void LeaveClosest() => IsClosest = false;

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
