import { PopkinHomeView } from '../../models/home';
import { PopkinSettingsView } from '../../models/popkin';
import { clock, wrapsUp } from './home-text';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEK_MS = 7 * 24 * 60 * 60_000;

/**
 * A Popkin's settings as the Host saved them, applied to what a screen holds (L2-020 AC3, AC4).
 * `PopkinChanged` is a state event: one for another Popkin, or no newer than what is held, is
 * dropped, and the same object comes back.
 */
export function applySettings(
  held: PopkinHomeView | null,
  change: PopkinSettingsView,
): PopkinHomeView | null {
  if (!held || held.id !== change.id || change.version <= held.version) return held;
  const { name, emoji, colour, length, endsAt, version } = change;
  return { ...held, name, emoji, colour, length, endsAt, version };
}

/** The hint of "Change how long it lasts": "Wraps up Sun, 6 pm", or "No end date". */
export function lengthHint(endsAt: string | null, now: Date): string {
  return endsAt ? wrapsUp(new Date(endsAt), now) : 'No end date';
}

/**
 * What a failed change of length says still holds (L2-020 AC6): "It still wraps up Sunday at
 * 6 pm." within a week, "It still wraps up 19 Sep at 6 pm." further away, and "It still keeps
 * going." when it has no end.
 */
export function stillEnds(endsAt: string | null, now: Date): string {
  if (!endsAt) return 'It still keeps going.';
  const end = new Date(endsAt);
  const day =
    end.getTime() - now.getTime() < WEEK_MS
      ? DAYS[end.getDay()]
      : `${end.getDate()} ${MONTHS[end.getMonth()]}${end.getFullYear() === now.getFullYear() ? '' : ` ${end.getFullYear()}`}`;
  return `It still wraps up ${day} at ${clock(end)}.`;
}
