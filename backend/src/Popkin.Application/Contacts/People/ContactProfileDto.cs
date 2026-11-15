using Popkin.Application.Abstractions;
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
    IReadOnlyList<string> Loves,
    bool IsClosest)
{
    public static ContactProfileDto Of(Contact contact, IPhotoStore photos) =>
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
            contact.Loves,
            contact.IsClosest);
}
