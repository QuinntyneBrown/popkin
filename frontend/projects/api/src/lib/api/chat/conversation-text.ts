import { messageTime } from './thread-text';

/**
 * The words of the Chat tab's list (L2-022), built from what the API answers. Times are read
 * on the device, as the member lives them.
 */
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * When a conversation was last written in: the time for today ("9:41"), the weekday within
 * the past week ("Fri"), then the date ("5 Sep"), with its year when it is another one.
 */
export function rowTime(sentAt: Date, now: Date): string {
  const days = Math.round((startOfDay(now) - startOfDay(sentAt)) / DAY);
  if (days <= 0) return messageTime(sentAt);
  if (days < 7) return WEEKDAYS[sentAt.getDay()];
  const day = `${sentAt.getDate()} ${MONTHS[sentAt.getMonth()]}`;
  return sentAt.getFullYear() === now.getFullYear() ? day : `${day} ${sentAt.getFullYear()}`;
}

/** The latest of a direct message, "You:" before the member's own (L2-022 AC2). */
export function directLatest(latest: { text: string; isMine: boolean }): string {
  return latest.isMine ? `You: ${latest.text}` : latest.text;
}

/** Letters alone, without case or accents: "Tomás" is found by "tomas". */
function plain(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/** Whether a member's name holds what was typed in "Search members" (L2-022 AC4). */
export function matchesMember(displayName: string, query: string): boolean {
  return plain(displayName).includes(plain(query));
}
