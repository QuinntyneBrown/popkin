using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Contacts.Dates;
using Popkin.Application.Contacts.FollowUps;
using Popkin.Application.Contacts.Habits;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Contacts.Today;

/// <summary>The next date that matters, with what the person knows of whose it is (L2-125 AC2).</summary>
public sealed record SpotlightDto(KeyDateRowDto Date, string? KnownAs, string? Phone, IReadOnlyList<string> Loves, string? LastTime);

/// <summary>A conversation or milestone logged lately (L2-125 AC6).</summary>
public sealed record RecentEntryDto(
    Guid EntryId,
    Guid ContactId,
    string FirstName,
    string Initials,
    PopkinColour Accent,
    string? PhotoUrl,
    TimelineEntryKind Kind,
    TalkChannel? Channel,
    string? Title,
    string? Note,
    DateOnly Day,
    int DaysAgo);

/// <summary>Someone not talked to in a while (L2-125 AC7).</summary>
public sealed record DriftingDto(Guid ContactId, string FirstName, string Initials, PopkinColour Accent, string? PhotoUrl, int DaysSince);

/// <summary>Today (L2-125): read in one request, for the device's day.</summary>
public sealed record TodayDto(
    string FirstName,
    int People,
    SpotlightDto? Next,
    IReadOnlyList<KeyDateRowDto> ComingUp,
    IReadOnlyList<FollowUpDto> FollowUps,
    IReadOnlyList<HabitDto> OverdueHabits,
    IReadOnlyList<RecentEntryDto> Recently,
    IReadOnlyList<DriftingDto> Drifting);

/// <summary>
/// Today's horizons and cuts (known gap 99, ruled): "Coming up" within 60 days and at most four
/// after the next date, five entries "Recently", and drifting after 30 days without a
/// conversation, at most five.
/// </summary>
public static class TodayRules
{
    public const int ComingUpDays = 60;

    public const int ComingUpMax = 4;

    public const int RecentMax = 5;

    public const int DriftDays = 30;

    public const int DriftMax = 5;

    /// <summary>The next date and those coming up, from every date's next occurrence.</summary>
    public static (T? Next, IReadOnlyList<T> ComingUp) Dates<T>(IEnumerable<(T Row, int DaysLeft)> occurrences)
        where T : class
    {
        var soonest = occurrences.OrderBy(o => o.DaysLeft).ToList();
        if (soonest.Count == 0)
        {
            return (null, []);
        }

        var comingUp = soonest.Skip(1).Where(o => o.DaysLeft <= ComingUpDays).Take(ComingUpMax).Select(o => o.Row).ToList();
        return (soonest[0].Row, comingUp);
    }

    /// <summary>Drifting: the last conversation more than 30 days ago; none logged is not drifting.</summary>
    public static bool IsDrifting(DateOnly? lastTalkedOn, DateOnly today) =>
        lastTalkedOn is { } last && today.DayNumber - last.DayNumber > DriftDays;

    /// <summary>"Last time:": the first sentence of the latest conversation's note, the owner's own words.</summary>
    public static string? LastTime(string? note)
    {
        if (string.IsNullOrWhiteSpace(note))
        {
            return null;
        }

        var text = note.Trim();
        var end = text.IndexOfAny(['.', '!', '?']);
        return end < 0 ? text : text[..(end + 1)];
    }
}

public sealed record GetTodayQuery(string? On) : IRequest<TodayDto>;

/// <summary>Reads only the caller's own Contacts (L2-122) and writes nothing.</summary>
public sealed class GetTodayQueryHandler(IAppDbContext db, ICurrentPerson current, ContactsSwitch contacts, IPhotoStore photos)
    : IRequestHandler<GetTodayQuery, TodayDto>
{
    public async Task<TodayDto> Handle(GetTodayQuery request, CancellationToken cancellationToken)
    {
        contacts.Require();
        var today = ContactsDayValidator.Parse(request.On);
        var owner = current.PersonId;
        var name = await db.People.Where(p => p.Id == owner).Select(p => p.Name).SingleAsync(cancellationToken);
        var people = await db.Contacts.OwnedBy(owner).ToListAsync(cancellationToken);
        var byId = people.ToDictionary(c => c.Id);
        var firstName = PersonName.FirstName(name);
        if (people.Count == 0)
        {
            return new TodayDto(firstName, 0, null, [], [], [], [], []);
        }

        var dates = await db.KeyDates.OwnedBy(owner).ToListAsync(cancellationToken);
        var occurrences = dates
            .Select(d => (Date: d, On: d.NextOccurrence(today)))
            .Where(o => o.On is not null && byId.ContainsKey(o.Date.ContactId))
            .Select(o => (Row: KeyDateRules.Row(o.Date, byId[o.Date.ContactId], o.On!.Value, today, photos),
                DaysLeft: o.On!.Value.DayNumber - today.DayNumber));
        var (next, comingUp) = TodayRules.Dates(occurrences);

        var conversations = await db.TimelineEntries.OwnedBy(owner)
            .Where(e => e.Kind == TimelineEntryKind.Conversation)
            .Select(e => new { e.ContactId, e.Day, e.Note, e.CreatedAt })
            .ToListAsync(cancellationToken);
        var lastTalk = conversations
            .GroupBy(c => c.ContactId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(c => c.Day).ThenByDescending(c => c.CreatedAt).First());

        SpotlightDto? spotlight = null;
        if (next is not null)
        {
            var whose = byId[next.ContactId];
            spotlight = new SpotlightDto(
                next, whose.KnownAs, whose.Phone, whose.Loves,
                lastTalk.TryGetValue(whose.Id, out var last) ? TodayRules.LastTime(last.Note) : null);
        }

        var followUps = (await db.FollowUps.OwnedBy(owner).Where(f => f.DoneAt == null && f.DueOn != null && f.DueOn <= today)
                .ToListAsync(cancellationToken))
            .OrderBy(f => f.DueOn)
            .ThenBy(f => f.CreatedAt)
            .Select(f => FollowUpDto.Of(f, f.ContactId is { } id ? byId.GetValueOrDefault(id) : null, photos))
            .ToList();

        var habits = (await db.Habits.OwnedBy(owner).Where(h => h.EndedAt == null).Include(h => h.Kept)
                .ToListAsync(cancellationToken))
            .Where(h => h.IsOverdue(today) && byId.ContainsKey(h.ContactId))
            .OrderBy(h => h.DueOn())
            .Select(h => HabitDto.Of(h, byId[h.ContactId], photos))
            .ToList();

        var recently = (await db.TimelineEntries.OwnedBy(owner)
                .OrderByDescending(e => e.Day)
                .ThenByDescending(e => e.CreatedAt)
                .Take(TodayRules.RecentMax)
                .ToListAsync(cancellationToken))
            .Where(e => byId.ContainsKey(e.ContactId))
            .Select(e =>
            {
                var who = byId[e.ContactId];
                return new RecentEntryDto(
                    e.Id, who.Id, PersonName.FirstName(who.Name), PersonName.Initials(who.Name), AvatarAccent.For(who.Id),
                    who.PhotoKey is { } key ? photos.GetReadUrl(key) : null,
                    e.Kind, e.Channel, e.Title, e.Note, e.Day, today.DayNumber - e.Day.DayNumber);
            })
            .ToList();

        var drifting = people
            .Where(c => TodayRules.IsDrifting(lastTalk.TryGetValue(c.Id, out var t) ? t.Day : null, today))
            .Select(c => new DriftingDto(
                c.Id, PersonName.FirstName(c.Name), PersonName.Initials(c.Name), AvatarAccent.For(c.Id),
                c.PhotoKey is { } key ? photos.GetReadUrl(key) : null,
                today.DayNumber - lastTalk[c.Id].Day.DayNumber))
            .OrderByDescending(d => d.DaysSince)
            .ThenBy(d => d.FirstName, StringComparer.CurrentCultureIgnoreCase)
            .Take(TodayRules.DriftMax)
            .ToList();

        return new TodayDto(firstName, people.Count, spotlight, comingUp, followUps, habits, recently, drifting);
    }
}
