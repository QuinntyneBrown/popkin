import { StretchView } from '../../models/this-week';

/*
 * The days of "My hours" (docs/detailed-designs/schedules/this-week): what a day says when its
 * hours break a rule, and the stretches it sends (L2-074 AC8). A time field cannot hold 24:00, so
 * an end of 00:00 after a start is midnight.
 */

/** A day of the dialog: "Thu 17", "Thursday", and its stretches as the fields hold them. */
export interface HoursDay {
  name: string;
  weekday: string;
  stretches: StretchView[];
}

const quarter = 15;

/** The first rule a day's hours break, in words; null when they keep them all. */
export function dayError(day: HoursDay): string | null {
  const filled = day.stretches.filter((s) => s.start || s.end);
  if (filled.some((s) => !s.start || !s.end)) return `${day.weekday} needs a start and an end.`;
  const minutes = filled.map((s) => ({ start: minutesOf(s.start), end: endOf(s.end) }));
  if (minutes.some((s) => s.start % quarter !== 0 || s.end % quarter !== 0)) {
    return `${day.weekday}’s times are on the quarter hour.`;
  }
  if (minutes.some((s) => s.end <= s.start)) return `${day.weekday} ends before it starts.`;
  if (minutes.length === 2 && minutes[1].start < minutes[0].end) {
    return `${day.weekday}’s second stretch starts before the first ends.`;
  }
  return null;
}

/** The stretches a day sends: the filled ones, with midnight at the end as "24:00". */
export function stretchesOf(day: HoursDay): StretchView[] {
  return day.stretches
    .filter((s) => s.start && s.end)
    .map((s) => ({ start: s.start, end: s.end === '00:00' ? '24:00' : s.end }));
}

function minutesOf(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/** An end of 00:00 is midnight, the end of the day. */
function endOf(time: string): number {
  const minutes = minutesOf(time);
  return minutes === 0 ? 24 * 60 : minutes;
}
