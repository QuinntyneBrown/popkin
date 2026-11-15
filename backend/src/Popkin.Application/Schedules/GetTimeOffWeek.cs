using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Invites;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Schedules;

/// <summary>What one day of a member's week is (L2-072 AC2).</summary>
public enum TimeOffStatus
{
    Off,
    Tentative,
    Working,
    Weekend,
}

/// <summary>What the group is getting together for, set by the Host (L2-085).</summary>
public sealed record EventDto(string Label, DateOnly FirstDay, DateOnly LastDay)
{
    public static EventDto? Of(PopkinSpace popkin) =>
        popkin is { EventLabel: { } label, EventFirstDay: { } first, EventLastDay: { } last } ? new(label, first, last) : null;
}

/// <summary>A member's row: a first name and an avatar, never a contact detail (L2-054 AC2).</summary>
public sealed record TimeOffMemberDto(Guid MembershipId, string FirstName, AvatarDto Avatar, bool IsMe, IReadOnlyList<TimeOffStatus> Days);

/// <summary>A week of the group's time off, Monday to Sunday (L2-072).</summary>
public sealed record TimeOffWeekDto(DateOnly Week, EventDto? Event, IReadOnlyList<TimeOffMemberDto> Members, bool CanEdit);

/// <summary>
/// Time off of one week for any member (L2-072, L2-077 AC3). Without a week, the event's week,
/// or else the week of the viewer's `Today`, the server's date when the app sends none (L2-072 AC8).
/// </summary>
public sealed record GetTimeOffWeekQuery(Guid PopkinId, DateOnly? Week, DateOnly? Today = null) : IRequest<TimeOffWeekDto>;

public sealed class GetTimeOffWeekQueryHandler(IAppDbContext db, IFeatureSwitches features, IMembershipGuard guard, IPhotoStore photos, TimeProvider clock)
    : IRequestHandler<GetTimeOffWeekQuery, TimeOffWeekDto>
{
    public async Task<TimeOffWeekDto> Handle(GetTimeOffWeekQuery request, CancellationToken cancellationToken)
    {
        // The switch comes first: while it is off, nothing of the feature answers (L2-077 AC3).
        features.Require(Feature.Schedules, request.PopkinId);
        var (popkin, membership) = await guard.RequireMemberAsync(request.PopkinId, cancellationToken);
        var day = request.Week ?? popkin.EventFirstDay ?? request.Today ?? DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime);
        return await TimeOffWeeks.ReadAsync(db, photos, popkin, membership, ScheduleRules.MondayOf(day), cancellationToken);
    }
}

/// <summary>The read of a week the query and the save answer alike.</summary>
public static class TimeOffWeeks
{
    public static async Task<TimeOffWeekDto> ReadAsync(
        IAppDbContext db, IPhotoStore photos, PopkinSpace popkin, Membership me, DateOnly monday, CancellationToken cancellationToken)
    {
        var members = await InviteMembers.OfAsync(db, popkin, cancellationToken);
        var ids = members.Select(m => m.Id).ToList();
        var sunday = monday.AddDays(ScheduleRules.DaysInAWeek - 1);
        var entries = (await db.TimeOffDays.AsNoTracking()
                .Where(d => ids.Contains(d.MembershipId) && d.Day >= monday && d.Day <= sunday)
                .ToListAsync(cancellationToken))
            .ToDictionary(d => (d.MembershipId, d.Day), d => d.Kind);

        var rows = members
            .Select(m => new TimeOffMemberDto(
                m.Id,
                PersonName.FirstName(m.DisplayName),
                AvatarDto.Of(m, photos),
                m.Id == me.Id,
                Enumerable.Range(0, ScheduleRules.DaysInAWeek).Select(i => StatusOf(entries, m.Id, monday.AddDays(i))).ToList()))
            .ToList();
        return new TimeOffWeekDto(monday, EventDto.Of(popkin), rows, popkin.Status == PopkinStatus.Active);
    }

    private static TimeOffStatus StatusOf(Dictionary<(Guid, DateOnly), TimeOffKind> entries, Guid membershipId, DateOnly day) =>
        day.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday ? TimeOffStatus.Weekend
        : entries.TryGetValue((membershipId, day), out var kind) ? (kind == TimeOffKind.Off ? TimeOffStatus.Off : TimeOffStatus.Tentative)
        : TimeOffStatus.Working;
}
