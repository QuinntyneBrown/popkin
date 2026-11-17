using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;
using Popkin.Application.Security;
using Popkin.Application.Notifications;
using Popkin.Domain;

namespace Popkin.Application.Schedules;

/// <summary>The body of `PUT …/schedule/time-off/{membershipId}`: any day of the week, and its five weekdays.</summary>
public sealed record SetTimeOffRequest(DateOnly Week, IReadOnlyList<string>? Days);

/// <summary>
/// A member sets their own time off for a week, Monday to Friday, each Off, Tentative or Working
/// (L2-073). Working removes the day's entry. Answers the week as time off shows it.
/// </summary>
public sealed record SetTimeOffCommand(Guid PopkinId, Guid MembershipId, DateOnly Week, IReadOnlyList<string>? Days)
    : IRequest<TimeOffWeekDto>;

public sealed class SetTimeOffCommandHandler(
    IAppDbContext db, IFeatureSwitches features, IMembershipGuard guard, IPhotoStore photos, IPopkinNotifier notifier, TimeProvider clock)
    : IRequestHandler<SetTimeOffCommand, TimeOffWeekDto>
{
    private const int Weekdays = 5;

    public async Task<TimeOffWeekDto> Handle(SetTimeOffCommand request, CancellationToken cancellationToken)
    {
        features.Require(Feature.Schedules, request.PopkinId);
        // Nothing new is added to a Popkin that has wrapped up (L2-045 AC2).
        var (popkin, membership) = await guard.RequireActiveMemberAsync(request.PopkinId, cancellationToken);
        if (request.MembershipId != membership.Id)
        {
            throw NotYours();
        }

        var monday = ScheduleRules.MondayOf(request.Week);
        if (!ScheduleRules.IsWithinAYear(monday, DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime)))
        {
            throw ProblemException.Invalid(
                "too_far_ahead", "Time off can be entered up to a year ahead.", "week");
        }

        var kinds = KindsOf(request.Days);
        var friday = monday.AddDays(Weekdays - 1);
        var held = await db.TimeOffDays
            .Where(d => d.MembershipId == membership.Id && d.Day >= monday && d.Day <= friday)
            .ToListAsync(cancellationToken);
        db.TimeOffDays.RemoveRange(held);
        for (var i = 0; i < Weekdays; i++)
        {
            if (kinds[i] is { } kind)
            {
                db.TimeOffDays.Add(TimeOffDay.Of(membership.Id, monday.AddDays(i), kind));
            }
        }

        db.ForMembers(NotificationKind.ScheduleChanges, popkin.Id, membership.PersonId, membership.Id, clock.GetUtcNow(), facts: new { change = "timeOff" });
        await db.SaveChangesAsync(cancellationToken);
        // The members with the view open read their week again (L2-072 AC11).
        await notifier.ScheduleChanged(popkin.Id);
        return await TimeOffWeeks.ReadAsync(db, photos, popkin, membership, monday, cancellationToken);
    }

    /// <summary>Another member's time off is theirs to set (L2-073 AC4).</summary>
    public static ProblemException NotYours() =>
        new(403, "not_your_schedule", "Each member sets their own schedule.");

    /// <summary>Five days, each Off, Tentative or Working; Working is no entry.</summary>
    private static TimeOffKind?[] KindsOf(IReadOnlyList<string>? days)
    {
        if (days is not { Count: Weekdays })
        {
            throw Invalid();
        }

        return days.Select(day => day switch
        {
            "Off" => TimeOffKind.Off,
            "Tentative" => TimeOffKind.Tentative,
            "Working" => (TimeOffKind?)null,
            _ => throw Invalid(),
        }).ToArray();
    }

    private static ProblemException Invalid() =>
        ProblemException.Invalid("invalid_time_off", "Each weekday is Off, Tentative or Working.", "days");
}
