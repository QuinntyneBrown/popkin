using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Invites;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Schedules;

/// <summary>A working stretch as times, "09:00" to "17:30"; midnight at the end is "24:00".</summary>
public sealed record StretchDto(string Start, string End)
{
    public static StretchDto Of(Stretch stretch) => new(Time(stretch.StartMinute), Time(stretch.EndMinute));

    public static string Time(int minutes) => $"{minutes / 60:00}:{minutes % 60:00}";
}

/// <summary>
/// One evening of this week (L2-074 AC2 to AC4): how many are free between 8 and 11 pm, the time
/// everyone is free from when everyone is, who is last off shift, and who is working.
/// </summary>
public sealed record EveningDto(
    DateOnly Date, int FreeCount, string? EveryoneFreeFrom, IReadOnlyList<string> LastOffShift, IReadOnlyList<string> Working);

/// <summary>A member's row of this week: seven days, each up to two stretches.</summary>
public sealed record ThisWeekMemberDto(
    Guid MembershipId, string FirstName, AvatarDto Avatar, bool IsMe, IReadOnlyList<IReadOnlyList<StretchDto>> Days);

/// <summary>Seven days from `From`, the viewer's today (L2-074).</summary>
public sealed record ThisWeekDto(
    DateOnly From, int MemberCount, bool CanEdit, IReadOnlyList<EveningDto> Days, IReadOnlyList<ThisWeekMemberDto> Members);

/// <summary>This week of a Popkin: seven days from `From`, or from the server's date without one.</summary>
public sealed record GetThisWeekQuery(Guid PopkinId, DateOnly? From) : IRequest<ThisWeekDto>;

public sealed class GetThisWeekQueryHandler(IAppDbContext db, IFeatureSwitches features, IMembershipGuard guard, IPhotoStore photos, TimeProvider clock)
    : IRequestHandler<GetThisWeekQuery, ThisWeekDto>
{
    public async Task<ThisWeekDto> Handle(GetThisWeekQuery request, CancellationToken cancellationToken)
    {
        // The switch comes first: while it is off, nothing of the feature answers (L2-077 AC3).
        features.Require(Feature.Schedules, request.PopkinId);
        var (popkin, membership) = await guard.RequireMemberAsync(request.PopkinId, cancellationToken);
        var from = request.From ?? DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime);
        return await ThisWeeks.ReadAsync(db, photos, popkin, membership, from, cancellationToken);
    }
}

/// <summary>The read of this week the query and the save of hours answer alike.</summary>
public static class ThisWeeks
{
    public static async Task<ThisWeekDto> ReadAsync(
        IAppDbContext db, IPhotoStore photos, PopkinSpace popkin, Membership me, DateOnly from, CancellationToken cancellationToken)
    {
        var members = await InviteMembers.OfAsync(db, popkin, cancellationToken);
        var ids = members.Select(m => m.Id).ToList();
        var last = from.AddDays(ScheduleRules.DaysInAWeek - 1);
        var stretches = (await db.WorkingStretches.AsNoTracking()
                .Where(s => ids.Contains(s.MembershipId) && s.Day >= from && s.Day <= last)
                .ToListAsync(cancellationToken))
            .ToLookup(s => (s.MembershipId, s.Day));
        var days = Enumerable.Range(0, ScheduleRules.DaysInAWeek).Select(i => from.AddDays(i)).ToList();
        var names = members.Select(m => PersonName.FirstName(m.DisplayName)).ToList();

        // Each day: every member's stretches, in the members' order.
        List<IReadOnlyCollection<Stretch>> DayOf(DateOnly day) =>
            members.Select(m => (IReadOnlyCollection<Stretch>)stretches[(m.Id, day)].OrderBy(s => s.Index).Select(s => s.Stretch).ToList()).ToList();

        var evenings = days.Select(day =>
        {
            var evening = EveningFreedom.Of(DayOf(day));
            return new EveningDto(
                day,
                evening.FreeCount,
                evening.EveryoneFreeFrom is { } free ? StretchDto.Time(free) : null,
                evening.LastOffShift.Select(i => names[i]).ToList(),
                evening.Working.Select(i => names[i]).ToList());
        }).ToList();

        var rows = members.Select((m, i) => new ThisWeekMemberDto(
                m.Id,
                names[i],
                AvatarDto.Of(m, photos),
                m.Id == me.Id,
                days.Select(day => (IReadOnlyList<StretchDto>)stretches[(m.Id, day)].OrderBy(s => s.Index).Select(s => StretchDto.Of(s.Stretch)).ToList()).ToList()))
            .ToList();
        return new ThisWeekDto(from, members.Count, popkin.Status == PopkinStatus.Active, evenings, rows);
    }
}
