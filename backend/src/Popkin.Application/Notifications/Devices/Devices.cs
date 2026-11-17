using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Contacts.Reminders;
using Popkin.Application.Notifications.Settings;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Notifications.Devices;

/// <summary>Web Push's public key (ADR 0028); empty while none is configured.</summary>
public sealed record PushPublicKey(string Value);

public sealed record PushKeyDto(string PublicKey);

public sealed record SaveTimeZoneRequest(string? Zone);

public sealed record SavePushSubscriptionRequest(string? Endpoint, string? P256dh, string? Auth);

/// <summary>
/// The device's IANA zone, saved when the web app starts: every "where the person is" rule reads
/// it, reminders at 8 am and quiet hours among them (L2-161 AC7).
/// </summary>
public sealed record SaveTimeZoneCommand(SaveTimeZoneRequest Request) : IRequest;

public sealed record GetPushKeyQuery : IRequest<PushKeyDto>;

/// <summary>A device that allowed alerts (ADR 0028), saved once per endpoint; it takes every kind.</summary>
public sealed record SavePushSubscriptionCommand(SavePushSubscriptionRequest Request) : IRequest;

public sealed record RemovePushSubscriptionCommand(string? Endpoint) : IRequest;

public sealed class SaveTimeZoneCommandHandler(IAppDbContext db, ICurrentPerson current) : IRequestHandler<SaveTimeZoneCommand>
{
    public async Task Handle(SaveTimeZoneCommand request, CancellationToken cancellationToken)
    {
        var zone = request.Request.Zone?.Trim();
        if (zone is not { Length: > 0 and <= 64 } || ReminderRules.TryZone(zone) is null)
        {
            throw new ProblemException(400, "invalid_time_zone", "That isn't a time zone.");
        }

        var preferences = await db.PreferencesOfAsync(current.PersonId, cancellationToken);
        if (preferences.TimeZone != zone)
        {
            preferences.ChangeTimeZone(zone);
            await db.SaveChangesAsync(cancellationToken);
        }
    }
}

public sealed class GetPushKeyQueryHandler(PushPublicKey key) : IRequestHandler<GetPushKeyQuery, PushKeyDto>
{
    public Task<PushKeyDto> Handle(GetPushKeyQuery request, CancellationToken cancellationToken) =>
        Task.FromResult(new PushKeyDto(key.Value));
}

public sealed class SavePushSubscriptionCommandHandler(IAppDbContext db, ICurrentPerson current, TimeProvider clock)
    : IRequestHandler<SavePushSubscriptionCommand>
{
    public async Task Handle(SavePushSubscriptionCommand request, CancellationToken cancellationToken)
    {
        var (endpoint, p256dh, auth) = (request.Request.Endpoint?.Trim(), request.Request.P256dh?.Trim(), request.Request.Auth?.Trim());
        if (endpoint is not { Length: > 0 and <= PushSubscription.MaxEndpointLength }
            || !Uri.TryCreate(endpoint, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps
            || p256dh is not { Length: > 0 and <= PushSubscription.MaxKeyLength }
            || auth is not { Length: > 0 and <= PushSubscription.MaxKeyLength })
        {
            throw new ProblemException(400, "invalid_push_subscription", "That isn't a push subscription.");
        }

        var row = await db.PushSubscriptions.SingleOrDefaultAsync(s => s.Endpoint == endpoint, cancellationToken);
        if (row is null)
        {
            db.PushSubscriptions.Add(PushSubscription.Subscribe(current.PersonId, endpoint, p256dh, auth, clock.GetUtcNow()));
        }
        else
        {
            row.Renew(current.PersonId, p256dh, auth);
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}

public sealed class RemovePushSubscriptionCommandHandler(IAppDbContext db, ICurrentPerson current)
    : IRequestHandler<RemovePushSubscriptionCommand>
{
    public async Task Handle(RemovePushSubscriptionCommand request, CancellationToken cancellationToken)
    {
        var row = await db.PushSubscriptions
            .SingleOrDefaultAsync(s => s.Endpoint == request.Endpoint && s.PersonId == current.PersonId, cancellationToken);
        if (row is not null)
        {
            db.PushSubscriptions.Remove(row);
            await db.SaveChangesAsync(cancellationToken);
        }
    }
}
