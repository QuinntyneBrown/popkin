import { HabitKeptDay, HabitRhythm } from '../../models/contacts';
import { parseDay } from './contact-dates-text';

/** One period of a habit's strip, oldest first: kept, missed, or the one in progress. */
export type HabitPeriod = 'kept' | 'missed' | 'due';

/** How many periods a strip draws at most (L2-143 AC1). */
export const HABIT_PERIODS = 12;

const DAY_MS = 86_400_000;

function startOf(day: Date): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate());
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((startOf(to).getTime() - startOf(from).getTime()) / DAY_MS);
}

/**
 * A day moved by whole periods, back when negative: 7 or 14 days, or calendar months from the
 * day itself, keeping its day or taking the month's last, as the API's `HabitSchedule` does.
 */
export function stepDay(day: Date, rhythm: HabitRhythm, steps: number): Date {
  if (rhythm !== 'Monthly') {
    const days = (rhythm === 'Weekly' ? 7 : 14) * steps;
    return new Date(day.getFullYear(), day.getMonth(), day.getDate() + days);
  }
  const month = day.getMonth() + steps;
  const last = new Date(day.getFullYear(), month + 1, 0).getDate();
  return new Date(day.getFullYear(), month, Math.min(day.getDate(), last));
}

/** Where a habit stands today: ahead of its due day, due on it, or overdue by some days (L2-143 AC3). */
export function habitDue(
  dueOn: string,
  today: Date,
): { state: 'ahead' | 'due' | 'overdue'; late: number } {
  const days = daysBetween(parseDay(dueOn), today);
  if (days > 0) return { state: 'overdue', late: days };
  return { state: days === 0 ? 'due' : 'ahead', late: 0 };
}

export interface HabitKeeping {
  /** Oldest first, the latest being the one today falls in. */
  periods: HabitPeriod[];
  /** Kept periods among those drawn. */
  kept: number;
  /** Kept periods in a row to the latest; a latest one still due does not break it. */
  run: number;
}

/**
 * A habit's strip (known gap 105, ruled): its periods count back from its due day in steps of its
 * rhythm, the latest holding today. A period is kept when a day kept falls in it; the latest,
 * unkept, is due; the rest unkept are missed. Periods ending on or before the day it started are
 * not drawn, and twelve at most are.
 */
export function habitKeeping(
  habit: { rhythm: HabitRhythm; startedOn: string; dueOn: string; kept: HabitKeptDay[] },
  today: Date,
): HabitKeeping {
  const due = parseDay(habit.dueOn);
  const started = parseDay(habit.startedOn).getTime();
  const now = startOf(today).getTime();
  // The step k whose period [due + (k-1)·r, due + k·r) holds today.
  let latest = 0;
  while (stepDay(due, habit.rhythm, latest).getTime() <= now) latest++;
  const days = habit.kept.map((k) => parseDay(k.on).getTime());
  const periods: HabitPeriod[] = [];
  for (let k = latest; periods.length < HABIT_PERIODS; k--) {
    const end = stepDay(due, habit.rhythm, k).getTime();
    if (end <= started) break;
    const start = stepDay(due, habit.rhythm, k - 1).getTime();
    const kept = days.some((d) => d >= start && d < end);
    periods.unshift(kept ? 'kept' : k === latest ? 'due' : 'missed');
  }
  let run = 0;
  for (let i = periods.length - 1; i >= 0; i--) {
    if (periods[i] === 'kept') run++;
    else if (!(periods[i] === 'due' && i === periods.length - 1)) break;
  }
  return { periods, kept: periods.filter((p) => p === 'kept').length, run };
}
