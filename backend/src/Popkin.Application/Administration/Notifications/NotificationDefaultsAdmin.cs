using System.Globalization;
using MediatR;
using Popkin.Application.Abstractions;
using Popkin.Application.Notifications;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Administration.Notifications;

/// <summary>
/// The five defaults as the Defaults tab shows them: times as "HH:mm", the birthday lead as "Off"
/// or a lead's name, and who last changed them when (L2-173 AC1).
/// </summary>
public sealed record AdminNotificationDefaultsDto(
    NotificationFrequency ActivityEmail,
    int BundleMinutes,
    int MostEmailsPerDay,
    string QuietFrom,
    string QuietTo,
    string BirthdayLead,
    DateTimeOffset? ChangedAt,
    string? ChangedByName)
{
    public static AdminNotificationDefaultsDto Of(NotificationPlatform platform)
    {
        var d = platform.CurrentDefaults;
        return new(
            d.ActivityEmail,
            d.BundleMinutes,
            d.MostEmailsPerDay,
            NotificationDefaultsText.Time(d.QuietFrom),
            NotificationDefaultsText.Time(d.QuietTo),
            NotificationDefaultsText.Lead(d.BirthdayLead),
            platform.DefaultsChangedAt,
            platform.DefaultsChangedByName);
    }
}

/// <summary>Any admin reads the defaults (L2-173 AC1).</summary>
public sealed record GetNotificationDefaultsQuery : IRequest<AdminNotificationDefaultsDto>;

public sealed class GetNotificationDefaultsQueryHandler(IAppDbContext db, IAdminGuard guard) : IRequestHandler<GetNotificationDefaultsQuery, AdminNotificationDefaultsDto>
{
    public async Task<AdminNotificationDefaultsDto> Handle(GetNotificationDefaultsQuery request, CancellationToken cancellationToken)
    {
        await guard.CurrentAdminAsync(cancellationToken);
        return AdminNotificationDefaultsDto.Of(await NotificationPlatformRow.ReadAsync(db, cancellationToken));
    }
}

/// <summary>An Owner saves the five defaults with a reason; they apply within a minute (L2-173 AC3, AC4).</summary>
public sealed record ChangeNotificationDefaultsCommand(
    string? ActivityEmail, int BundleMinutes, int MostEmailsPerDay, string? QuietFrom, string? QuietTo, string? BirthdayLead, string? Reason)
    : IRequest<AdminNotificationDefaultsDto>;

public sealed class ChangeNotificationDefaultsCommandHandler(IAppDbContext db, IAdminGuard guard, IAuditLog audit, TimeProvider clock)
    : IRequestHandler<ChangeNotificationDefaultsCommand, AdminNotificationDefaultsDto>
{
    public async Task<AdminNotificationDefaultsDto> Handle(ChangeNotificationDefaultsCommand request, CancellationToken cancellationToken)
    {
        var me = await guard.RequireAsync(AdminAction.ManageNotifications, cancellationToken);
        var reason = ReasonRules.Required(request.Reason);
        var next = NotificationDefaultsText.Parse(request);
        if (NotificationDefaultsRules.Check(next) is { } wrong)
        {
            throw NotificationDefaultsText.NotAllowed(wrong.Field, wrong.Message);
        }

        var platform = await NotificationPlatformRow.LoadAsync(db, cancellationToken);
        var old = platform.CurrentDefaults;
        if (!platform.ChangeDefaults(next, me.Name, clock.GetUtcNow()))
        {
            throw ProblemException.Invalid("no_change", "Nothing has changed.", "defaults");
        }

        await audit.RecordAsync(
            new AuditRecord(AuditAction.ChangedNotificationDefaults, AuditTargetKind.NotificationDefaults, "notification-defaults", "Notification defaults", reason,
                NotificationDefaultsText.Changes(old, next)),
            cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return AdminNotificationDefaultsDto.Of(platform);
    }
}

internal static class NotificationDefaultsText
{
    public static string Time(TimeOnly time) => time.ToString("HH:mm", CultureInfo.InvariantCulture);

    public static string Lead(ReminderLead? lead) => lead?.ToString() ?? "Off";

    public static ProblemException NotAllowed(string field, string message) => ProblemException.Invalid("default_not_allowed", message, field);

    /// <summary>Reads the request in the API's order, refusing a value that is not one of the table's.</summary>
    public static NotificationDefaults Parse(ChangeNotificationDefaultsCommand request)
    {
        var frequency = Enum.TryParse<NotificationFrequency>(request.ActivityEmail, out var f) && Enum.IsDefined(f) && request.ActivityEmail is { } name && !int.TryParse(name, out _)
            ? f
            : throw NotAllowed("activityEmail", "Choose As it happens, Daily digest or Weekly digest.");
        var from = ParseTime(request.QuietFrom, "quietFrom");
        var to = ParseTime(request.QuietTo, "quietTo");
        ReminderLead? lead = request.BirthdayLead == "Off"
            ? null
            : Enum.TryParse<ReminderLead>(request.BirthdayLead, out var l) && Enum.IsDefined(l) && !int.TryParse(request.BirthdayLead, out _)
                ? l
                : throw NotAllowed("birthdayLead", "Choose Off, On the day, 1 day before, 3 days before or 1 week before.");
        return new NotificationDefaults(frequency, request.BundleMinutes, request.MostEmailsPerDay, from, to, lead);
    }

    private static TimeOnly ParseTime(string? text, string field) =>
        TimeOnly.TryParseExact(text, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var time)
            ? time
            : throw NotAllowed(field, "Enter a time on the hour or half hour, such as 21:00.");

    /// <summary>`{ default: { old, new } }` for each default that changed (L2-120 AC5).</summary>
    public static IReadOnlyDictionary<string, object?> Changes(NotificationDefaults old, NotificationDefaults next)
    {
        var changes = new Dictionary<string, object?>();
        Add("activityEmail", old.ActivityEmail.ToString(), next.ActivityEmail.ToString());
        Add("bundleMinutes", old.BundleMinutes, next.BundleMinutes);
        Add("mostEmailsPerDay", old.MostEmailsPerDay, next.MostEmailsPerDay);
        Add("quietFrom", Time(old.QuietFrom), Time(next.QuietFrom));
        Add("quietTo", Time(old.QuietTo), Time(next.QuietTo));
        Add("birthdayLead", Lead(old.BirthdayLead), Lead(next.BirthdayLead));
        return changes;

        void Add(string field, object before, object after)
        {
            if (!Equals(before, after))
            {
                changes[field] = new Dictionary<string, object?> { ["old"] = before, ["new"] = after };
            }
        }
    }
}
