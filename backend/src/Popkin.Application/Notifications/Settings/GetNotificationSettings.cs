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

/// <summary>
/// The Notifications screen in one read (L2-155). The words come from the catalogue, so the web app
/// keeps no copy of the list. The Popkins, birthdays and muted people come with their own designs.
/// </summary>
public sealed record NotificationSettingsDto(ActivityEmailDto Email, IReadOnlyList<NotificationGroupDto> Groups);

public sealed record GetNotificationSettingsQuery : IRequest<NotificationSettingsDto>;

public sealed class GetNotificationSettingsQueryHandler(IAppDbContext db, ICurrentPerson current)
    : IRequestHandler<GetNotificationSettingsQuery, NotificationSettingsDto>
{
    public async Task<NotificationSettingsDto> Handle(GetNotificationSettingsQuery request, CancellationToken cancellationToken)
    {
        var personId = current.PersonId;
        var email = await db.People.AsNoTracking().Where(p => p.Id == personId).Select(p => p.Email).SingleAsync(cancellationToken);
        var preferences = await db.NotificationPreferences.AsNoTracking().SingleOrDefaultAsync(p => p.PersonId == personId, cancellationToken);
        var choices = await db.NotificationKindChoices.AsNoTracking().Where(c => c.PersonId == personId).ToListAsync(cancellationToken);
        var settings = new EffectiveNotificationSettings(preferences, choices);

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
                        OffForEveryone: false))
                    .ToList()))
            .ToList();

        return new NotificationSettingsDto(new ActivityEmailDto(available && settings.EmailOn, available, settings.Frequency), groups);
    }
}
