using Popkin.Application.Contacts.Groups;
using Popkin.Application.Abstractions;
using Popkin.Application.Contacts.Connections;
using Popkin.Application.Contacts.Dates;
using Popkin.Application.Contacts.Habits;
using Popkin.Domain;

namespace Popkin.Application.Contacts.People;

/// <summary>
/// A contact as the profile and the edit form show them (L2-128, L2-130). The key dates, habit,
/// connections, groups and counts join it as their designs are built.
/// </summary>
public sealed record ContactProfileDto(
    Guid Id,
    string Name,
    string FirstName,
    string Initials,
    PopkinColour Accent,
    string? PhotoUrl,
    string? KnownAs,
    ContactCircle? Circle,
    string? City,
    string? Phone,
    string? Email,
    string? HowWeMet,
    IReadOnlyList<string> Loves,
    bool IsClosest,
    IReadOnlyList<ContactKeyDateDto> KeyDates,
    ContactKeptDto? Kept = null,
    HabitDto? Habit = null,
    IReadOnlyList<AroundDto>? Around = null,
    IReadOnlyList<GroupChipDto>? Groups = null)
{
    /// <summary>
    /// The profile with "People around {first name}": their connections (L2-150 AC4) and the chips
    /// of their groups (L2-146 AC4).
    /// </summary>
    public async Task<ContactProfileDto> WithAroundAsync(IAppDbContext db, Guid owner, IPhotoStore photos, CancellationToken cancellationToken) =>
        this with
        {
            Around = await ConnectionReads.AroundAsync(db, owner, Id, photos, cancellationToken),
            Groups = await GroupReads.OfContactAsync(db, owner, Id, cancellationToken),
        };

    public static ContactProfileDto Of(
        Contact contact, IPhotoStore photos, IReadOnlyList<ContactKeyDateDto>? keyDates = null, ContactKeptDto? kept = null, HabitDto? habit = null) =>
        new(
            contact.Id,
            contact.Name,
            PersonName.FirstName(contact.Name),
            PersonName.Initials(contact.Name),
            AvatarAccent.For(contact.Id),
            contact.PhotoKey is { } key ? photos.GetReadUrl(key) : null,
            contact.KnownAs,
            contact.Circle,
            contact.City,
            contact.Phone,
            contact.Email,
            contact.HowWeMet,
            contact.Loves,
            contact.IsClosest,
            keyDates ?? [],
            kept,
            habit);
}

/// <summary>What is kept about a contact and would go with them (L2-132 AC1): their timeline entries and memories.</summary>
public sealed record ContactKeptDto(int TimelineEntries, int Memories);
