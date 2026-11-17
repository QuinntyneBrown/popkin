using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Contacts.Security;
using Popkin.Application.Photos;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Contacts.Habits;

/// <summary>
/// One habit as Habits and a profile show it (L2-143, L2-128 AC5): its contact, what and how
/// often, its last time and due day, and the days kept as far back as its strip reaches, newest
/// first. The web app counts the strip and the run from them (known gap 105, ruled).
/// </summary>
public sealed record HabitDto(
    Guid Id,
    Guid ContactId,
    string ContactFirstName,
    string ContactName,
    string ContactInitials,
    PopkinColour ContactAccent,
    string? ContactPhone,
    string? ContactPhotoUrl,
    string What,
    HabitRhythm Rhythm,
    DateOnly StartedOn,
    DateOnly LastTime,
    DateOnly DueOn,
    IReadOnlyList<HabitKeptDayDto> Kept)
{
    /// <summary>How many periods back the strip reaches, and one more for a period still due.</summary>
    public const int Periods = 13;

    public static HabitDto Of(Habit habit, Contact contact, IPhotoStore photos)
    {
        var due = habit.DueOn();
        var since = HabitSchedule.Step(due, habit.Rhythm, -Periods);
        return new(
            habit.Id,
            contact.Id,
            PersonName.FirstName(contact.Name),
            contact.Name,
            PersonName.Initials(contact.Name),
            AvatarAccent.For(contact.Id),
            contact.Phone,
            contact.PhotoKey is { } key ? photos.GetReadUrl(key) : null,
            habit.What,
            habit.Rhythm,
            habit.StartedOn,
            habit.LastTime,
            due,
            habit.Kept
                .Where(k => k.KeptOn >= since)
                .OrderByDescending(k => k.KeptOn)
                .ThenByDescending(k => k.CreatedAt)
                .Select(k => new HabitKeptDayDto(k.Id, k.KeptOn))
                .ToList());
    }
}

/// <summary>A day kept, with the id its Undo removes.</summary>
public sealed record HabitKeptDayDto(Guid Id, DateOnly On);

/// <summary>"We met up" kept: the keep Undo removes, and the habit with its next due day (L2-144 AC1).</summary>
public sealed record HabitKeptDto(Guid KeptId, HabitDto Habit);

/// <summary>"Start the habit": the rhythm as `Weekly`, `EveryTwoWeeks` or `Monthly`.</summary>
public sealed record StartHabitRequest(Guid ClientId, Guid ContactId, string? What, string? Rhythm);

/// <summary>"We met up": the device's day, as `yyyy-MM-dd`.</summary>
public sealed record KeepHabitRequest(Guid ClientId, string? KeptOn);

/// <summary>What a habit must be (L2-145 AC2, known gap 105 ruled), and one loaded for its owner alone (L2-122).</summary>
public static class HabitRules
{
    public static ProblemException NotFound() => new(404, "habit_not_found", "This habit isn't in your Contacts.");

    public static ProblemException Exists() => new(409, "habit_exists", "You already have a habit with them.");

    public static string What(string? what)
    {
        var trimmed = string.IsNullOrWhiteSpace(what)
            ? throw ProblemException.Invalid("what_required", "Say what you’ll do together, like “Sunday call”.", "what")
            : what.Trim();
        return trimmed.Length <= Habit.MaxWhatLength
            ? trimmed
            : throw ProblemException.Invalid("what_too_long", $"Keep it to {Habit.MaxWhatLength} characters.", "what");
    }

    public static HabitRhythm Rhythm(string? rhythm) =>
        Enum.TryParse<HabitRhythm>(rhythm, ignoreCase: false, out var parsed) && Enum.IsDefined(parsed)
            ? parsed
            : throw ProblemException.Invalid("rhythm_not_allowed", "Choose weekly, every 2 weeks or monthly.", "rhythm");

    /// <summary>The device's day kept: a calendar day within one day of the API's own (known gap 104).</summary>
    public static DateOnly KeptOn(string? keptOn, DateOnly today)
    {
        var day = DateOnly.TryParseExact(keptOn, "yyyy-MM-dd", out var parsed)
            ? parsed
            : throw ProblemException.Invalid("kept_on_out_of_range", "That isn't today.", "keptOn");
        return Math.Abs(day.DayNumber - today.DayNumber) <= 1
            ? day
            : throw ProblemException.Invalid("kept_on_out_of_range", "That isn't today.", "keptOn");
    }

    /// <summary>The caller's habit with its days kept, running or ended.</summary>
    public static async Task<Habit> RequireOwnedAsync(IAppDbContext db, Guid owner, Guid id, CancellationToken cancellationToken) =>
        await db.Habits.OwnedBy(owner).Include(h => h.Kept).SingleOrDefaultAsync(h => h.Id == id, cancellationToken)
            ?? throw NotFound();

    public static async Task<HabitDto> DtoAsync(IAppDbContext db, Habit habit, IPhotoStore photos, CancellationToken cancellationToken)
    {
        var contact = await db.Contacts.AsNoTracking().SingleAsync(c => c.Id == habit.ContactId, cancellationToken);
        return HabitDto.Of(habit, contact, photos);
    }

    /// <summary>Whether the contact already has a running habit other than <paramref name="except"/>.</summary>
    public static Task<bool> RunningWithAsync(IAppDbContext db, Guid owner, Guid contactId, Guid? except, CancellationToken cancellationToken) =>
        db.Habits.OwnedBy(owner).AnyAsync(h => h.ContactId == contactId && h.EndedAt == null && h.Id != except, cancellationToken);

    public static DateOnly Today(TimeProvider clock) => DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime);
}

/// <summary>Habits (L2-143): every running habit of the caller's, the one due soonest first.</summary>
public sealed record GetHabitsQuery : IRequest<IReadOnlyList<HabitDto>>;

public sealed class GetHabitsQueryHandler(IAppDbContext db, ICurrentPerson current, ContactsSwitch contacts, IPhotoStore photos)
    : IRequestHandler<GetHabitsQuery, IReadOnlyList<HabitDto>>
{
    public async Task<IReadOnlyList<HabitDto>> Handle(GetHabitsQuery request, CancellationToken cancellationToken)
    {
        contacts.Require();
        var owner = current.PersonId;
        var habits = await db.Habits.OwnedBy(owner).Where(h => h.EndedAt == null).Include(h => h.Kept).AsNoTracking().ToListAsync(cancellationToken);
        var people = await db.Contacts.OwnedBy(owner).AsNoTracking().ToDictionaryAsync(c => c.Id, cancellationToken);
        return habits
            .Where(h => people.ContainsKey(h.ContactId))
            .Select(h => HabitDto.Of(h, people[h.ContactId], photos))
            .OrderBy(h => h.DueOn)
            .ThenBy(h => h.ContactName, StringComparer.CurrentCultureIgnoreCase)
            .ToList();
    }
}

public sealed record StartHabitCommand(StartHabitRequest Habit) : IRequest<StartedHabit>;

/// <summary>The habit, and whether this request started it (201) or a resend found it (200).</summary>
public sealed record StartedHabit(HabitDto Habit, bool Created);

/// <summary>"Start the habit" (L2-145 AC1–3, AC6): its first last time is the day it starts.</summary>
public sealed class StartHabitCommandHandler(
    IAppDbContext db, ICurrentPerson current, ContactsSwitch contacts, IContactGuard guard, IPhotoStore photos, TimeProvider clock)
    : IRequestHandler<StartHabitCommand, StartedHabit>
{
    public async Task<StartedHabit> Handle(StartHabitCommand request, CancellationToken cancellationToken)
    {
        contacts.Require();
        var owner = current.PersonId;
        var body = request.Habit;
        if (await ClientWrites.FindAsync(db.Habits.Include(h => h.Kept), owner, body.ClientId, cancellationToken) is { } saved)
        {
            return new StartedHabit(await HabitRules.DtoAsync(db, saved, photos, cancellationToken), false);
        }

        var what = HabitRules.What(body.What);
        var rhythm = HabitRules.Rhythm(body.Rhythm);
        var contact = await guard.RequireOwnedAsync(body.ContactId, cancellationToken);
        if (await HabitRules.RunningWithAsync(db, owner, contact.Id, null, cancellationToken))
        {
            throw HabitRules.Exists();
        }

        var habit = Habit.Start(owner, contact.Id, what, rhythm, HabitRules.Today(clock), body.ClientId, clock.GetUtcNow());
        db.Habits.Add(habit);
        await db.SaveChangesAsync(cancellationToken);
        return new StartedHabit(HabitDto.Of(habit, contact, photos), true);
    }
}

public sealed record KeepHabitCommand(Guid HabitId, KeepHabitRequest Keep) : IRequest<KeptHabit>;

/// <summary>The keep, and whether this request kept it (201) or a resend found it (200).</summary>
public sealed record KeptHabit(HabitKeptDto Kept, bool Created);

/// <summary>"We met up" (L2-144 AC1): kept once per client id; the due day moves on from it.</summary>
public sealed class KeepHabitCommandHandler(
    IAppDbContext db, ICurrentPerson current, ContactsSwitch contacts, IPhotoStore photos, TimeProvider clock)
    : IRequestHandler<KeepHabitCommand, KeptHabit>
{
    public async Task<KeptHabit> Handle(KeepHabitCommand request, CancellationToken cancellationToken)
    {
        contacts.Require();
        var habit = await HabitRules.RequireOwnedAsync(db, current.PersonId, request.HabitId, cancellationToken);
        if (habit.EndedAt is not null)
        {
            throw HabitRules.NotFound();
        }

        if (habit.Kept.FirstOrDefault(k => k.ClientId == request.Keep.ClientId) is { } saved)
        {
            return new KeptHabit(new HabitKeptDto(saved.Id, await HabitRules.DtoAsync(db, habit, photos, cancellationToken)), false);
        }

        var kept = habit.Keep(HabitRules.KeptOn(request.Keep.KeptOn, HabitRules.Today(clock)), request.Keep.ClientId, clock.GetUtcNow());
        db.HabitKept.Add(kept);
        await db.SaveChangesAsync(cancellationToken);
        return new KeptHabit(new HabitKeptDto(kept.Id, await HabitRules.DtoAsync(db, habit, photos, cancellationToken)), true);
    }
}

/// <summary>"Undo" a keep (L2-144 AC2): the habit as it was; a keep already undone changes nothing.</summary>
public sealed record UnkeepHabitCommand(Guid HabitId, Guid KeptId) : IRequest<HabitDto>;

public sealed class UnkeepHabitCommandHandler(IAppDbContext db, ICurrentPerson current, ContactsSwitch contacts, IPhotoStore photos)
    : IRequestHandler<UnkeepHabitCommand, HabitDto>
{
    public async Task<HabitDto> Handle(UnkeepHabitCommand request, CancellationToken cancellationToken)
    {
        contacts.Require();
        var habit = await HabitRules.RequireOwnedAsync(db, current.PersonId, request.HabitId, cancellationToken);
        if (habit.Kept.FirstOrDefault(k => k.Id == request.KeptId) is { } kept)
        {
            habit.Kept.Remove(kept);
            db.HabitKept.Remove(kept);
            await db.SaveChangesAsync(cancellationToken);
        }

        return await HabitRules.DtoAsync(db, habit, photos, cancellationToken);
    }
}

/// <summary>"End this habit" (L2-144 AC3): it leaves Habits and the profile; ending twice changes nothing.</summary>
public sealed record EndHabitCommand(Guid HabitId) : IRequest;

public sealed class EndHabitCommandHandler(IAppDbContext db, ICurrentPerson current, ContactsSwitch contacts, TimeProvider clock)
    : IRequestHandler<EndHabitCommand>
{
    public async Task Handle(EndHabitCommand request, CancellationToken cancellationToken)
    {
        contacts.Require();
        var habit = await HabitRules.RequireOwnedAsync(db, current.PersonId, request.HabitId, cancellationToken);
        habit.End(clock.GetUtcNow());
        await db.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>The Undo of "End this habit": back as it was, unless another was started with them since.</summary>
public sealed record ResumeHabitCommand(Guid HabitId) : IRequest<HabitDto>;

public sealed class ResumeHabitCommandHandler(IAppDbContext db, ICurrentPerson current, ContactsSwitch contacts, IPhotoStore photos)
    : IRequestHandler<ResumeHabitCommand, HabitDto>
{
    public async Task<HabitDto> Handle(ResumeHabitCommand request, CancellationToken cancellationToken)
    {
        contacts.Require();
        var owner = current.PersonId;
        var habit = await HabitRules.RequireOwnedAsync(db, owner, request.HabitId, cancellationToken);
        if (habit.EndedAt is not null)
        {
            if (await HabitRules.RunningWithAsync(db, owner, habit.ContactId, habit.Id, cancellationToken))
            {
                throw HabitRules.Exists();
            }

            habit.Resume();
            await db.SaveChangesAsync(cancellationToken);
        }

        return await HabitRules.DtoAsync(db, habit, photos, cancellationToken);
    }
}
