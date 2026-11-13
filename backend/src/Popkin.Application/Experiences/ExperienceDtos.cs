using Popkin.Application.Abstractions;
using Popkin.Application.Invites;
using Popkin.Domain;

namespace Popkin.Application.Experiences;

/// <summary>Who shared an experience: a first name and an avatar, never a contact detail (L2-054 AC2).</summary>
public sealed record ExperienceSharerDto(Guid MembershipId, string FirstName, AvatarDto Avatar)
{
    public static ExperienceSharerDto Of(Membership sharer, IPhotoStore store) =>
        new(sharer.Id, PersonName.FirstName(sharer.DisplayName), AvatarDto.Of(sharer, store));
}

/// <summary>
/// What a member said about an experience: the words they added to their rating, with the stars
/// they gave (L2-038 AC4, L2-041).
/// </summary>
public sealed record ExperienceCommentDto(Guid MembershipId, string FirstName, AvatarDto Avatar, int Stars, string Text, DateTimeOffset CommentedAt);

/// <summary>
/// An experience as its card shows it (L2-037): the Popkin's emoji and colour stand in the
/// picture's place when it has none (L2-040 AC5), and a picture is its thumbnail at an expiring
/// address (L2-051 AC2); the average is null until someone rates it.
/// Nobody can say they are keen until journey 20, so the keen count is 0.
/// </summary>
public sealed record ExperienceCardDto(
    Guid Id,
    ExperienceKind Kind,
    string Title,
    string? PictureUrl,
    string Emoji,
    PopkinColour Colour,
    ExperienceSharerDto SharedBy,
    string? When,
    DateTimeOffset SharedAt,
    double? Average,
    int RatingCount,
    int KeenCount)
{
    public static ExperienceCardDto Of(Experience experience, PopkinSpace popkin, Membership sharer, IPhotoStore store) =>
        new(
            experience.Id,
            experience.Kind,
            experience.Title,
            experience.PictureThumbnailKey is { } thumbnailKey ? store.GetReadUrl(thumbnailKey) : null,
            popkin.Emoji,
            popkin.Colour,
            ExperienceSharerDto.Of(sharer, store),
            experience.When,
            experience.SharedAt,
            Average: null,
            RatingCount: 0,
            KeenCount: 0);
}
