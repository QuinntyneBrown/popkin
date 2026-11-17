using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Domain;

namespace Popkin.Application.Notifications.Settings;

/// <summary>Whether activity email comes and how often; `available` is false with no email address (L2-156).</summary>
public sealed record ActivityEmailDto(bool On, bool Available, NotificationFrequency Frequency);

public sealed record NotificationKindDto(
    NotificationKind Kind, string Name, string About, bool Email, bool Phone, bool Required, bool OffForEveryone);

public sealed record NotificationGroupDto(NotificationGroup Group, string Name, string About, IReadOnlyList<NotificationKindDto> Kinds);

/// <summary>One active Popkin and the level the person keeps for it (L2-158 AC1).</summary>
public sealed record PopkinLevelDto(
    Guid PopkinId, string Name, string Emoji, PopkinColour Colour, int People, DateTimeOffset? EndsAt, PopkinNotificationLevel Level);

/// <summary>
/// The Notifications screen in one read (L2-155). The words come from the catalogue, so the web app
/// keeps no copy of the list. The Popkins, birthdays and muted people come with their own designs.
/// </summary>
public sealed record NotificationSettingsDto(
    ActivityEmailDto Email,
    IReadOnlyList<NotificationGroupDto> Groups,
    IReadOnlyList<PopkinLevelDto> Popkins,
    IReadOnlyList<Mutes.MutedPersonDto> Muted,
    IReadOnlyList<BirthdayReminderDto> Birthdays)
{
    /// <summary>"Show all {n} contacts with birthdays" (L2-159 AC2).</summary>
    public int BirthdayCount => Birthdays.Count;
}

public sealed record GetNotificationSettingsQuery : IRequest<NotificationSettingsDto>;

public sealed class GetNotificationSettingsQueryHandler(IAppDbContext db, ICurrentPerson current, IPhotoStore photos, Contacts.ContactsSwitch contacts, INotificationPlatform platform, TimeProvider clock)
    : IRequestHandler<GetNotificationSettingsQuery, NotificationSettingsDto>
{
    public async Task<NotificationSettingsDto> Handle(GetNotificationSettingsQuery request, CancellationToken cancellationToken)
    {
        var personId = current.PersonId;
        var email = await db.People.AsNoTracking().Where(p => p.Id == personId).Select(p => p.Email).SingleAsync(cancellationToken);
        var preferences = await db.NotificationPreferences.AsNoTracking().SingleOrDefaultAsync(p => p.PersonId == personId, cancellationToken);
        var choices = await db.NotificationKindChoices.AsNoTracking().Where(c => c.PersonId == personId).ToListAsync(cancellationToken);
        var platformRow = await NotificationPlatformRow.ReadAsync(db, cancellationToken);
        var settings = new EffectiveNotificationSettings(preferences, choices, platformRow.DefaultFrequency);

        var available = email is not null;
        var groups = NotificationCatalogue.Groups
            .Select(group => new NotificationGroupDto(
                group.Group,
                group.Name,
                group.About,
                NotificationCatalogue.All
                    .Where(entry => entry.Group == group.Group)
                    .Select(entry => new NotificationKindDto(
                        entry.Kind,
                        entry.Name,
                        entry.About,
                        settings.IsOn(entry.Kind, NotificationChannel.Email),
                        settings.IsOn(entry.Kind, NotificationChannel.Phone),
                        entry.Required,
                        OffForEveryone: !entry.Required && platform.IsKindOff(entry.Kind)))
                    .ToList()))
            .ToList();

        // The person's active Popkins, most recently active first as on My Popkins.
        var popkins = await db.Memberships.AsNoTracking()
            .Where(m => m.PersonId == personId && m.LeftAt == null)
            .Join(db.Popkins.Where(p => p.Status != PopkinStatus.WrappedUp), m => m.PopkinId, p => p.Id, (m, p) => new { Membership = m, Popkin = p })
            .OrderByDescending(x => x.Popkin.LastActivityAt)
            .Select(x => new PopkinLevelDto(
                x.Popkin.Id,
                x.Popkin.Name,
                x.Popkin.Emoji,
                x.Popkin.Colour,
                db.Memberships.Count(o => o.PopkinId == x.Popkin.Id && o.LeftAt == null),
                x.Popkin.EndsAt,
                x.Membership.NotificationLevel))
            .ToListAsync(cancellationToken);

        return new NotificationSettingsDto(
            new ActivityEmailDto(available && settings.EmailOn, available, settings.Frequency),
            groups,
            popkins,
            await Mutes.MutedPeople.OfAsync(db, photos, personId, cancellationToken),
            await BirthdayReminders.OfAsync(db, photos, contacts, personId, preferences?.TimeZone, clock.GetUtcNow(), cancellationToken));
    }
}
