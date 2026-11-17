using Microsoft.EntityFrameworkCore;
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
    IReadOnlyList<GroupChipDto>? Groups = null,
    PopkinLinkDto? AlsoIn = null)
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
            AlsoIn = await PopkinLinkDto.SharedAsync(db, owner, Id, cancellationToken),
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

/// <summary>
/// "Also in your Popkin": for a contact imported from an account (L2-151), the newest Popkin the
/// owner and that person are both still in, and how many more they share. It reads the Popkin's
/// name, emoji and colour only, and tells the other person nothing.
/// </summary>
public sealed record PopkinLinkDto(Guid PopkinId, string Name, string Emoji, PopkinColour Colour, int More)
{
    public static async Task<PopkinLinkDto?> SharedAsync(IAppDbContext db, Guid owner, Guid contactId, CancellationToken cancellationToken)
    {
        var personId = await db.Contacts.Where(c => c.Id == contactId && c.OwnerId == owner).Select(c => c.PersonId).SingleOrDefaultAsync(cancellationToken);
        if (personId is not { } person)
        {
            return null;
        }

        var mine = db.Memberships.Where(m => m.PersonId == owner && m.LeftAt == null).Select(m => m.PopkinId);
        var shared = await (
            from m in db.Memberships
            where m.PersonId == person && m.LeftAt == null && mine.Contains(m.PopkinId)
            join p in db.Popkins on m.PopkinId equals p.Id
            select new { p.Id, p.Name, p.Emoji, p.Colour, p.LastActivityAt })
            .ToListAsync(cancellationToken);
        var newest = shared.OrderByDescending(p => p.LastActivityAt).ThenBy(p => p.Id).FirstOrDefault();
        return newest is null ? null : new PopkinLinkDto(newest.Id, newest.Name, newest.Emoji, newest.Colour, shared.Count - 1);
    }
}
