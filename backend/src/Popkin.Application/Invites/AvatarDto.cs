using Popkin.Domain;

namespace Popkin.Application.Invites;

/// <summary>
/// A member as an avatar: initials on the colour that stays theirs (L2-013 AC6) and, when they
/// have a photo, its expiring address (L2-051 AC2). It carries no name.
/// </summary>
public sealed record AvatarDto(string Initials, PopkinColour Accent, string? PhotoUrl)
{
    public static AvatarDto Of(Membership membership) =>
        new(PersonName.Initials(membership.DisplayName), AvatarAccent.For(membership.PersonId), null);
}
