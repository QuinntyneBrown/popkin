// Traces to: L2-143 AC3, L2-144 AC1, L2-145, known gap 105 (ruled)
// Description: When a habit is due and overdue, one case per row of the design's table, and what it must be.
using Popkin.Application.Contacts.Habits;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Tests.Contacts;

public sealed class HabitTests
{
    private static readonly DateTimeOffset Now = new(2026, 9, 15, 8, 40, 0, TimeSpan.Zero);

    private static DateOnly D(string day) => DateOnly.Parse(day, System.Globalization.CultureInfo.InvariantCulture);

    // Rhythm | Last time | Due day | Today | State, as docs/detailed-designs/contacts/habits draws it.
    [Theory]
    [InlineData(HabitRhythm.Weekly, "2026-09-13", "2026-09-20", "2026-09-15", false)]
    [InlineData(HabitRhythm.EveryTwoWeeks, "2026-08-30", "2026-09-13", "2026-09-15", true)]
    [InlineData(HabitRhythm.EveryTwoWeeks, "2026-09-15", "2026-09-29", "2026-09-15", false)]
    [InlineData(HabitRhythm.Monthly, "2026-09-03", "2026-10-03", "2026-09-15", false)]
    [InlineData(HabitRhythm.Monthly, "2026-01-31", "2026-02-28", "2026-03-01", true)]
    [InlineData(HabitRhythm.Weekly, "2026-09-08", "2026-09-15", "2026-09-15", false)]
    public void Due_and_overdue(HabitRhythm rhythm, string lastTime, string dueOn, string today, bool overdue)
    {
        var habit = Habit.Start(Guid.NewGuid(), Guid.NewGuid(), "Lunch", rhythm, D("2026-01-01"), Guid.NewGuid(), Now);
        habit.Keep(D(lastTime), Guid.NewGuid(), Now);

        Assert.Equal(D(dueOn), HabitSchedule.Next(D(lastTime), rhythm));
        Assert.Equal(D(dueOn), habit.DueOn());
        Assert.Equal(overdue, habit.IsOverdue(D(today)));
    }

    [Fact]
    public void A_new_habit_is_due_a_rhythm_after_it_starts()
    {
        var habit = Habit.Start(Guid.NewGuid(), Guid.NewGuid(), "Sunday call", HabitRhythm.Weekly, D("2026-09-15"), Guid.NewGuid(), Now);

        Assert.Equal(D("2026-09-15"), habit.LastTime);
        Assert.Equal(D("2026-09-22"), habit.DueOn());
    }

    [Fact]
    public void Its_last_time_is_the_latest_day_kept_whatever_the_order()
    {
        var habit = Habit.Start(Guid.NewGuid(), Guid.NewGuid(), "Lunch", HabitRhythm.EveryTwoWeeks, D("2026-01-01"), Guid.NewGuid(), Now);
        habit.Keep(D("2026-08-30"), Guid.NewGuid(), Now);
        habit.Keep(D("2026-08-16"), Guid.NewGuid(), Now);

        Assert.Equal(D("2026-08-30"), habit.LastTime);
    }

    [Theory]
    [InlineData(HabitRhythm.Weekly, -2, "2026-09-01")]
    [InlineData(HabitRhythm.EveryTwoWeeks, -1, "2026-09-01")]
    [InlineData(HabitRhythm.Monthly, -1, "2026-08-15")]
    [InlineData(HabitRhythm.Monthly, 5, "2027-02-15")]
    public void Steps_back_and_on(HabitRhythm rhythm, int steps, string expected) =>
        Assert.Equal(D(expected), HabitSchedule.Step(D("2026-09-15"), rhythm, steps));

    [Theory]
    [InlineData("  Sunday call ", "Sunday call")]
    [InlineData("A walk round Roundhay Park, then tea at the café by the lake if it isn’t too busy", null)]
    [InlineData("   ", null)]
    public void What(string what, string? kept)
    {
        if (kept is null)
        {
            Assert.Throws<ProblemException>(() => HabitRules.What(what));
        }
        else
        {
            Assert.Equal(kept, HabitRules.What(what));
        }
    }

    [Theory]
    [InlineData("2026-09-14", true)]
    [InlineData("2026-09-16", true)]
    [InlineData("2026-09-13", false)]
    [InlineData("15/09/2026", false)]
    public void A_day_kept_is_within_one_day_of_today(string keptOn, bool accepted)
    {
        if (accepted)
        {
            Assert.Equal(D(keptOn), HabitRules.KeptOn(keptOn, D("2026-09-15")));
        }
        else
        {
            Assert.Equal("kept_on_out_of_range", Assert.Throws<ProblemException>(() => HabitRules.KeptOn(keptOn, D("2026-09-15"))).Code);
        }
    }
}
