using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Notifications.Settings;

/// <summary>Reads the names of the catalogue only; a number or an unknown word is not a kind (L2-174 AC5).</summary>
public static class NotificationNames
{
    public static bool TryKind(string? value, out NotificationKind kind) => TryName(value, out kind);

    public static bool TryFrequency(string? value, out NotificationFrequency frequency) => TryName(value, out frequency);

    private static bool TryName<T>(string? value, out T result)
        where T : struct, Enum
    {
        result = default;
        return value is { Length: > 0 }
            && !char.IsDigit(value[0])
            && value[0] != '-'
            && Enum.TryParse(value, ignoreCase: false, out result)
            && Enum.IsDefined(result);
    }
}

internal static class PreferencesRows
{
    public static async Task<NotificationPreferences> PreferencesOfAsync(this IAppDbContext db, Guid personId, CancellationToken ct)
    {
        var row = await db.NotificationPreferences.SingleOrDefaultAsync(p => p.PersonId == personId, ct);
        if (row is null)
        {
            row = NotificationPreferences.For(personId);
            db.NotificationPreferences.Add(row);
        }

        return row;
    }
}

/// <summary>One kind on one or both channels (L2-157 AC3); the other kinds and channels are untouched.</summary>
public sealed record SetNotificationKindCommand(string Kind, bool? Email, bool? Phone) : IRequest;

public sealed class SetNotificationKindCommandHandler(IAppDbContext db, ICurrentPerson current)
    : IRequestHandler<SetNotificationKindCommand>
{
    public async Task Handle(SetNotificationKindCommand request, CancellationToken cancellationToken)
    {
        if (!NotificationNames.TryKind(request.Kind, out var kind))
        {
            throw new ProblemException(400, "invalid_kind", "That isn't a kind of notification.");
        }

        if (request.Email is null && request.Phone is null)
        {
            throw new ProblemException(400, "nothing_to_change", "Say which channel to switch.");
        }

        if (NotificationCatalogue.Of(kind).Required)
        {
            throw new ProblemException(400, "notification_required", "Sign-in codes and security are always sent.");
        }

        var personId = current.PersonId;
        var choice = await db.NotificationKindChoices.SingleOrDefaultAsync(c => c.PersonId == personId && c.Kind == kind, cancellationToken);
        if (choice is null)
        {
            choice = NotificationKindChoice.For(personId, kind);
            db.NotificationKindChoices.Add(choice);
        }

        if (request.Email is { } email)
        {
            choice.Choose(NotificationChannel.Email, email);
        }

        if (request.Phone is { } phone)
        {
            choice.Choose(NotificationChannel.Phone, phone);
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>
/// Activity email on or off (L2-156 AC3, AC4). Off keeps every kind's choice, so on brings them
/// back; an account without an email address cannot turn it on (AC5).
/// </summary>
public sealed record SetActivityEmailCommand(bool? On) : IRequest;

public sealed class SetActivityEmailCommandHandler(IAppDbContext db, ICurrentPerson current, TimeProvider clock)
    : IRequestHandler<SetActivityEmailCommand>
{
    public async Task Handle(SetActivityEmailCommand request, CancellationToken cancellationToken)
    {
        if (request.On is not { } on)
        {
            throw new ProblemException(400, "nothing_to_change", "Say whether email is on.");
        }

        var personId = current.PersonId;
        if (on)
        {
            var hasEmail = await db.People.AnyAsync(p => p.Id == personId && p.Email != null, cancellationToken);
            if (!hasEmail)
            {
                throw new ProblemException(409, "no_email_address", "Add an email to your account to get Popkin email.");
            }
        }

        var preferences = await db.PreferencesOfAsync(personId, cancellationToken);
        preferences.TurnEmail(on, clock.GetUtcNow());
        await db.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>As it happens, a daily digest or a weekly digest (L2-156 AC1).</summary>
public sealed record SetActivityFrequencyCommand(string? Frequency) : IRequest;

public sealed class SetActivityFrequencyCommandHandler(IAppDbContext db, ICurrentPerson current, TimeProvider clock)
    : IRequestHandler<SetActivityFrequencyCommand>
{
    public async Task Handle(SetActivityFrequencyCommand request, CancellationToken cancellationToken)
    {
        if (!NotificationNames.TryFrequency(request.Frequency, out var frequency))
        {
            throw new ProblemException(400, "invalid_frequency", "Choose as it happens, a daily digest or a weekly digest.");
        }

        var preferences = await db.PreferencesOfAsync(current.PersonId, cancellationToken);
        preferences.ChooseFrequency(frequency, clock.GetUtcNow());
        await db.SaveChangesAsync(cancellationToken);
    }
}
