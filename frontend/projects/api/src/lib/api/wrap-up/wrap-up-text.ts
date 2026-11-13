import { clock } from '../popkins/home-text';
import { timeLeft } from '../popkins/time-left';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const HOUR_MS = 60 * 60_000;
const DAY_MS = 24 * HOUR_MS;
const grouped = new Intl.NumberFormat('en-US');

/** A count with its thousands separators (L2-046 AC2): "1,286". */
export function count(value: number): string {
  return grouped.format(value);
}

const plural = (value: number, one: string, many: string) => (value === 1 ? one : many);

/**
 * The dates a Popkin ran, on the device (L2-046 AC1): "Fri 11 – Sun 13 Sep". Each end names
 * its month, and its year, only where the two differ.
 */
export function ranDates(startedAt: string, wrappedUpAt: string): string {
  const from = new Date(startedAt);
  const to = new Date(wrappedUpAt);
  const years = from.getFullYear() !== to.getFullYear();
  const months = years || from.getMonth() !== to.getMonth();
  const day = (at: Date, month: boolean, year: boolean) =>
    [
      DAYS[at.getDay()],
      at.getDate(),
      month ? MONTHS[at.getMonth()] : '',
      year ? at.getFullYear() : '',
    ]
      .filter((part) => part !== '')
      .join(' ');
  const last = day(to, true, years);
  return !months && from.getDate() === to.getDate()
    ? last
    : `${day(from, months, years)} – ${last}`;
}

/** "14 people showed up". */
export function peopleLine(people: number): string {
  return `${count(people)} ${plural(people, 'person', 'people')} showed up`;
}

/** What a figure of the recap counts: "messages sent", "photos shared". */
export function statLabel(what: 'messages' | 'photos', value: number): string {
  return what === 'messages'
    ? `${plural(value, 'message', 'messages')} sent`
    : `${plural(value, 'photo', 'photos')} shared`;
}

export function topRatedBy(firstName: string): string {
  return `shared by ${firstName}`;
}

/**
 * The notice of an album that was not kept (L2-045 AC4), while its photos are still there:
 * the days left, counted up to the next whole day. Null for a kept album and once they went.
 */
export function photosGo(
  photosRemoveAt: string | null,
  now: Date,
): { lead: string; text: string } | null {
  if (!photosRemoveAt) return null;
  const left = new Date(photosRemoveAt).getTime() - now.getTime();
  if (left <= 0) return null;
  const days = Math.ceil(left / DAY_MS);
  const lead =
    left < DAY_MS ? 'Photos go today.' : `Photos go in ${days} ${plural(days, 'day', 'days')}.`;
  return { lead, text: 'Save the album to keep them.' };
}

/** "Preparing 12 of 48": how far the album's zip is (L2-046 AC4). */
export function exportProgress(done: number, total: number): string {
  return `Preparing ${count(done)} of ${count(total)}`;
}

/** "Wrapped up Sun 13 Sep": what a read-only thread says under its name (L2-045 AC1). */
export function wrappedUpOn(wrappedUpAt: string): string {
  const at = new Date(wrappedUpAt);
  return `Wrapped up ${DAYS[at.getDay()]} ${at.getDate()} ${MONTHS[at.getMonth()]}`;
}

/**
 * The banner of a Popkin's last hour (L2-044 AC2): "1 hour left." at the hour, the time left
 * under it, and when it wraps up. Null with more than an hour left, with none, and for a
 * Popkin that keeps going.
 */
export function wrapUpWarning(
  name: string,
  endsAt: string | null,
  now: Date,
): { lead: string; text: string } | null {
  if (!endsAt) return null;
  const end = new Date(endsAt);
  const left = end.getTime() - now.getTime();
  if (left <= 0 || left > HOUR_MS) return null;
  const lead = left === HOUR_MS ? '1 hour left.' : `${timeLeft(end, now)}.`;
  return { lead, text: `${name} wraps up at ${clock(end)}.` };
}

/** What the wrap-up screen says under its question, to everyone it affects (L2-043 AC1). */
export function wrapUpLede(memberCount: number): string {
  const whom =
    memberCount < 2
      ? ''
      : memberCount === 2
        ? ' for both of you'
        : ` for all ${count(memberCount)} of you`;
  return `Every good Popkin ends. Here’s what happens next${whom}.`;
}

/** The line under the recap the wrap-up screen previews. */
export function recapPreviewLine(photoCount: number, messageCount: number): string {
  const photos = `${count(photoCount)} ${plural(photoCount, 'photo', 'photos')}`;
  const messages = `${count(messageCount)} ${plural(messageCount, 'message', 'messages')}`;
  return `The recap everyone gets · ${photos}, ${messages}`;
}

/** What "Keep the photo album" means, on and off (L2-043 AC2). */
export function keepAlbumLine(keepPhotos: boolean): string {
  return keepPhotos ? 'Members can keep browsing and saving' : 'Photos are removed after 30 days';
}
