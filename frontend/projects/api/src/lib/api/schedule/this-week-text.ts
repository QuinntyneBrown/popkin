import { addDays, dateOf, weekLabel } from './schedule-weeks';
import { LONG_WEEKDAYS as weekdays } from '../text/calendar';

/*
 * What this week says (docs/detailed-designs/schedules/this-week): the headline of the chosen
 * evening and the sentence under it, the chat action and its draft, the timeline and its text.
 */

/** One evening as the API answers it (L2-074 AC2 to AC4). */
export interface EveningText {
  freeCount: number;
  /** "19:30" when everyone is free; null when someone is working. */
  everyoneFreeFrom: string | null;
  lastOffShift: string[];
  working: string[];
}

/** A working stretch, "09:00" to "17:30"; midnight at the end is "24:00". */
export interface StretchText {
  start: string;
  end: string;
}

/** A block of the timeline, in percent of the noon-to-midnight track. */
export interface ShiftBlock {
  left: number;
  width: number;
  /** "Working till 5:30 pm"; "Working" for a stretch that runs to midnight. */
  label: string;
}

const numbers = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
];

/** The track runs from noon to midnight (L2-074 AC5). */
const noon = 12 * 60;
const midnight = 24 * 60;

/** "7:30 pm", "5 pm", "12 pm", "9 am"; "midnight" for the end of the day. */
export function clockTime(time: string): string {
  const minutes = minutesOf(time);
  if (minutes === midnight) return 'midnight';
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  const part = hour < 12 ? 'am' : 'pm';
  return minute === 0
    ? `${twelve} ${part}`
    : `${twelve}:${String(minute).padStart(2, '0')} ${part}`;
}

/** "4/6 free" (L2-074 AC2). */
export function freeLabel(free: number, members: number): string {
  return `${free}/${members} free`;
}

/** A count of members in words from two to twelve ("six"), digits above. */
export function countWord(n: number): string {
  return n >= 2 && n <= 12 ? numbers[n] : String(n);
}

/** "Dev", "Dev and Ellie", "Dev, Ellie and Sam". */
export function listOf(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** "Sep 12 – 18 · everyone’s working hours" (L2-074 AC1). */
export function subtitleOf(from: string): string {
  return `${weekLabel(from)} · everyone’s working hours`;
}

/**
 * "Wednesday, everyone’s free from" with the time to stress (L2-074 AC3), or "Tuesday, 3 of 6
 * are free in the evening." (AC4).
 */
export function headlineOf(
  weekday: string,
  evening: EveningText,
  members: number,
): { text: string; time: string | null } {
  if (evening.everyoneFreeFrom) {
    return {
      text: `${weekday}, everyone’s free from `,
      time: `${clockTime(evening.everyoneFreeFrom)}.`,
    };
  }
  const verb = evening.freeCount === 1 ? 'is' : 'are';
  return {
    text: `${weekday}, ${evening.freeCount} of ${members} ${verb} free in the evening.`,
    time: null,
  };
}

/**
 * The sentence under the headline: who is last off shift, or who is working, and what the week
 * holds besides. `everyoneDays` counts the evenings of the week everyone is free;
 * `everyoneDay` names the one when there is one.
 */
export function sentenceOf(
  evening: EveningText,
  members: number,
  everyoneDays: number,
  everyoneDay?: string,
): string {
  if (evening.everyoneFreeFrom) {
    const last = evening.lastOffShift;
    const who =
      last.length === 0
        ? 'Nobody works past 5 pm.'
        : `${listOf(last)} ${last.length === 1 ? 'is' : 'are'} the last off shift.`;
    return everyoneDays === 1
      ? `${who} The only evening this week all ${countWord(members)} of you are around.`
      : who;
  }
  const working = evening.working;
  const who = `${listOf(working)} ${working.length === 1 ? 'is' : 'are'} working.`;
  return everyoneDays === 1 && everyoneDay
    ? `${who} ${everyoneDay} is the one evening everyone is free.`
    : who;
}

/** "Plan dinner in chat" when everyone is free, else "Ask in chat anyway" (L2-074 AC7). */
export function actionOf(evening: EveningText): {
  label: string;
  variant: 'popkin' | 'secondary';
} {
  return evening.everyoneFreeFrom
    ? { label: 'Plan dinner in chat', variant: 'popkin' }
    : { label: 'Ask in chat anyway', variant: 'secondary' };
}

/** The message the Everyone thread opens with, not yet sent (L2-074 AC7). */
export function draftOf(weekday: string, evening: EveningText, free: string[]): string {
  return evening.everyoneFreeFrom
    ? `Everyone’s free ${weekday} from ${clockTime(evening.everyoneFreeFrom)}. Dinner to catch up on the plan? Ideas for where?`
    : `${listOf(free)}: free ${weekday} evening? Could be a small dinner to catch up on the plan.`;
}

/** Each stretch on the noon-to-midnight track; one that ends by noon has no block (L2-074 AC5). */
export function blocksOf(stretches: StretchText[]): ShiftBlock[] {
  return stretches
    .map((stretch) => ({ start: minutesOf(stretch.start), end: minutesOf(stretch.end) }))
    .filter((stretch) => stretch.end > noon)
    .map(({ start, end }) => {
      const from = Math.max(start, noon);
      return {
        left: percentOf(from),
        width: ((end - from) / (midnight - noon)) * 100,
        label: end === midnight ? 'Working' : `Working till ${clockTime(timeOf(end))}`,
      };
    });
}

/** Where the tint starts: the time everyone is free from. */
export function tintAt(from: string): number {
  return percentOf(minutesOf(from));
}

/** The timeline as text for assistive technology (L2-074 AC6). */
export function timelineText(rows: { name: string; stretches: StretchText[] }[]): string {
  const parts = rows.map(({ name, stretches }) =>
    stretches.length === 0
      ? `${name}: free all afternoon and evening`
      : `${name}: working ${stretches
          .map((s) => `${clockTime(s.start)} to ${clockTime(s.end)}`)
          .join(' and ')}`,
  );
  return `${parts.join('; ')}.`;
}

/** "All six free from" and its time, when everyone is free (L2-074 AC5). */
export function legendOf(
  evening: EveningText,
  members: number,
): { allFree: string | null; time: string | null } {
  return evening.everyoneFreeFrom
    ? { allFree: `All ${countWord(members)} free from `, time: clockTime(evening.everyoneFreeFrom) }
    : { allFree: null, time: null };
}

/** The seven days from the first: "2026-09-12" to "2026-09-18". */
export function sevenDaysFrom(from: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(from, i));
}

function minutesOf(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function timeOf(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function percentOf(minutes: number): number {
  return ((minutes - noon) / (midnight - noon)) * 100;
}

/**
 * The home's Schedule line (L2-075 AC2): "Everyone’s free Wednesday from 7:30 pm", or "No
 * evening this week is free for everyone".
 */
export function homeLineOf(summary: {
  day: string | null;
  everyoneFreeFrom: string | null;
}): string {
  if (!summary.day || !summary.everyoneFreeFrom) return 'No evening this week is free for everyone';
  const weekday = weekdays[dateOf(summary.day).getDay()];
  return `Everyone’s free ${weekday} from ${clockTime(summary.everyoneFreeFrom)}`;
}
