import { AdminNotificationKind, AdminSendStatus } from '../../../models/admin';
import { plural } from '../../text/counts';

/** The page's line under its title (L2-169 AC1). */
export const NOTIFICATIONS_SUB =
  'Email and phone alerts to members. Switch a kind off for everyone, or hold mail for one Popkin or person.';

const DASH = '—';
const number = (n: number) => new Intl.NumberFormat('en-GB').format(n);
/** "3,240 emails", "1 email". */
const counted = (n: number, one: string) => `${number(n)} ${plural(n, one)}`;
const percent = (p: number | null) =>
  p === null ? DASH : `${new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 }).format(p)}%`;

/** "41 s", or whole minutes from two minutes on: "3 min". */
function duration(seconds: number | null): string {
  if (seconds === null) return DASH;
  return seconds < 120 ? `${Math.round(seconds)} s` : `${Math.round(seconds / 60)} min`;
}

function time(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
}

function day(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone, day: 'numeric', month: 'short' }).format(
    new Date(iso),
  );
}

/** "Email is sending" or "All member email is paused" (L2-169 AC2, AC3). */
export function statusTitle(status: AdminSendStatus): string {
  return status.paused ? 'All member email is paused' : 'Email is sending';
}

/**
 * "48,210 sent today · 0.4% bounced · median 41 s from change to inbox", or, paused, "3,240
 * emails queued since 10:12, paused by Lena Fischer: “Digest sending twice.” Sign-in codes still
 * go out." A figure not counted yet reads "—" (gap 129).
 */
export function statusText(status: AdminSendStatus, timeZone: string): string {
  if (!status.paused) {
    return `${number(status.sentToday)} sent today · ${percent(status.bouncedPercent)} bounced · median ${duration(status.medianSecondsToInbox)} from change to inbox`;
  }
  const since = status.pausedAt ? ` since ${time(status.pausedAt, timeZone)}` : '';
  const by = status.pausedByName ? `, paused by ${status.pausedByName}` : '';
  const why = status.pauseReason ? `: “${status.pauseReason}”` : '.';
  return `${counted(status.queued, 'email')} queued${since}${by}${why} Sign-in codes still go out.`;
}

/** What sends a kind, or, off for everyone, "Off since 9 Jul by Lena Fischer: “…”" (L2-171 AC2). */
export function kindAbout(kind: AdminNotificationKind, timeZone: string): string {
  if (!kind.offForEveryone) return kind.about;
  const since = kind.offSince ? ` since ${day(kind.offSince, timeZone)}` : '';
  const by = kind.offByName ? ` by ${kind.offByName}` : '';
  const why = kind.offReason ? `: “${kind.offReason}”` : '';
  return `Off${since}${by}${why}`;
}

/** "Sent, 24 h": "9,412", or "—" for a kind off for everyone (L2-171 AC2). */
export function kindSent(kind: AdminNotificationKind): string {
  return kind.offForEveryone ? DASH : number(kind.sent24h);
}

/** "Opened": "61%", or "—" for a kind off for everyone or not counted yet. */
export function kindOpened(kind: AdminNotificationKind): string {
  return kind.offForEveryone ? DASH : percent(kind.openedPercent);
}

/** Under the name on a phone: "9,412 sent · 61% opened" (L2-169 AC5). */
export function kindTotals(kind: AdminNotificationKind): string {
  return `${kindSent(kind)} sent · ${kindOpened(kind)} opened`;
}

/** The failure every notification dialog shows; the reason is kept as typed (L2-087 AC5). */
export const NOTIFICATION_SAVE_FAILED = {
  heading: 'That didn’t go through',
  text: 'Nothing has changed. Your reason is kept; try again.',
};

export interface NotificationDialogText {
  heading: string;
  description: string;
  confirm: string;
  busy: string;
  keep: string;
  placeholder: string;
}

/** "Pause all member email?" (L2-170 AC1). */
export const PAUSE_DIALOG: NotificationDialogText = {
  heading: 'Pause all member email?',
  description:
    'Every activity email and reminder stops within a minute and queues. Sign-in codes keep sending. Anything queued longer than 6 hours is dropped when you resume.',
  confirm: 'Pause all email',
  busy: 'Pausing…',
  keep: 'Keep sending',
  placeholder: 'e.g. Daily digest sending twice since 3.4.1',
};

/** "Resume sending?", with how many are queued and about how long they take (L2-170 AC3). */
export function resumeDialog(status: AdminSendStatus): NotificationDialogText {
  const minutes = status.resumeMinutes ?? 1;
  return {
    heading: 'Resume sending?',
    description: `${counted(status.queued, 'queued email')} send in order over about ${counted(minutes, 'minute')}. Changes older than 6 hours are dropped rather than sent late.`,
    confirm: 'Resume sending',
    busy: 'Resuming…',
    keep: 'Stay paused',
    placeholder: 'e.g. Digest fixed in 3.4.2',
  };
}

/** A kind's name inside a sentence: "new photos", but "Popkin wrapping up". */
export function kindInSentence(name: string): string {
  return name.startsWith('Popkin') ? name : name.charAt(0).toLowerCase() + name.slice(1);
}

/** "Turn new photos off for everyone?" or "Turn experiences back on?" (L2-171 AC1, AC3). */
export function kindDialog(name: string, on: boolean): NotificationDialogText {
  const kind = kindInSentence(name);
  // "Experiences start", "Group chat starts".
  const plural = /s$|^Stories/.test(name);
  return on
    ? {
        heading: `Turn ${kind} back on?`,
        description: plural
          ? `${name} start sending again from the next change, to members who have them on.`
          : `${name} starts sending again from the next change, to members who have it on.`,
        confirm: 'Turn on',
        busy: 'Turning on…',
        keep: 'Cancel',
        placeholder: 'e.g. Rating emails fixed in 3.4.2',
      }
    : {
        heading: `Turn ${kind} off for everyone?`,
        description: `No member gets ${kind} by email or phone, whatever their settings. Their own choices are kept and come back when you switch it on.`,
        confirm: 'Turn off for everyone',
        busy: 'Turning off…',
        keep: 'Keep it on',
        placeholder: 'e.g. Photo emails firing twice',
      };
}

/** The toast after a change: [title, text]. */
export const PAUSED_TOAST = [
  'Member email paused',
  'Activity email and reminders queue until you resume. Sign-in codes keep sending.',
] as const;

export const RESUMED_TOAST = ['Sending resumed', 'Queued email sends in order.'] as const;

export function kindToast(name: string, on: boolean): readonly [string, string] {
  return on
    ? [`${name} is back on`, 'It sends again from the next change.']
    : [`${name} is off for everyone`, 'Members’ own choices come back when you switch it on.'];
}
