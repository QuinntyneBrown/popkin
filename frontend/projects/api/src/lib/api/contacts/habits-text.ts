import { HabitRhythm } from '../../models/contacts';
import { parseDay } from './contact-dates-text';
import { habitDue } from './habit-rules';

const RHYTHMS: Record<HabitRhythm, string> = {
  Weekly: 'Weekly',
  EveryTwoWeeks: 'Every 2 weeks',
  Monthly: 'Monthly',
};

const PERIODS: Record<HabitRhythm, string> = {
  Weekly: 'week',
  EveryTwoWeeks: 'fortnight',
  Monthly: 'month',
};

const WORDS = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];

/** "How often" as a choice of New habit offers it (L2-145 AC1). */
export const HABIT_RHYTHMS: readonly { value: HabitRhythm; label: string }[] = (
  ['Weekly', 'EveryTwoWeeks', 'Monthly'] as const
).map((value) => ({ value, label: RHYTHMS[value] }));

function short(day: string): string {
  return parseDay(day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function withWeekday(day: string): string {
  return parseDay(day).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** "Weekly", "Every 2 weeks", "Monthly". */
export function habitRhythmLabel(rhythm: HabitRhythm): string {
  return RHYTHMS[rhythm];
}

/** "Lunch with Chidi" (L2-122 AC4). */
export function habitTitle(what: string, firstName: string): string {
  return `${what} with ${firstName}`;
}

/** "Two days overdue": in words to nine, then figures (known gap 105, ruled). */
export function habitLate(days: number): string {
  const count = days <= WORDS.length ? WORDS[days - 1] : `${days}`;
  return `${count} ${days === 1 ? 'day' : 'days'} overdue`;
}

/** "Every 2 weeks · you’ve kept 9 of the last 12" (L2-143 AC2). */
export function habitSub(rhythm: HabitRhythm, kept: number, periods: number): string {
  return `${RHYTHMS[rhythm]} · you’ve kept ${kept} of the last ${periods}`;
}

/** "10 weeks running", from two in a row (L2-143 AC6). */
export function habitRun(run: number, rhythm: HabitRhythm): string | undefined {
  return run >= 2 ? `${run} ${PERIODS[rhythm]}s running` : undefined;
}

/** A row's next: "Next Sun, Sep 20", "Due today" or "Overdue since Sep 13" (L2-143 AC1, AC3, AC7). */
export function habitNext(dueOn: string, today: Date): string {
  const due = habitDue(dueOn, today);
  if (due.state === 'due') return 'Due today';
  return due.state === 'overdue' ? `Overdue since ${short(dueOn)}` : `Next ${withWeekday(dueOn)}`;
}

/** The profile's foot: "Next: Oct 11", "Due today" or "Overdue since Sep 13" (L2-128 AC5). */
export function habitFoot(dueOn: string, today: Date): string {
  const due = habitDue(dueOn, today);
  if (due.state === 'due') return 'Due today';
  return due.state === 'overdue' ? `Overdue since ${short(dueOn)}` : `Next: ${short(dueOn)}`;
}

/** "Logged for this fortnight" (L2-144 AC1). */
export function habitLoggedFor(rhythm: HabitRhythm): string {
  return `Logged for this ${PERIODS[rhythm]}`;
}

/** The kept toast's line: "Your next one is due by Tue, Sep 29." (L2-144 AC1). */
export function habitDueBy(dueOn: string): string {
  return `Your next one is due by ${withWeekday(dueOn)}.`;
}
