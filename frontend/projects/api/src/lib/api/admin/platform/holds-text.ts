import { AdminNotificationHold, NotificationHoldUntil } from '../../../models/admin';
import { plural } from '../../text/counts';
import { NotificationDialogText } from './notifications-text';

/** What "Held" says a hold does (L2-172 AC1). */
export const HELD_SUB =
  'No email or phone alerts go to these, whatever their own settings say. Members aren’t told.';

const number = (n: number) => new Intl.NumberFormat('en-GB').format(n);

/** The Popkin's or the person's name. */
export function holdName(hold: AdminNotificationHold): string {
  return hold.popkin?.name ?? hold.person?.name ?? '';
}

/** "Popkin · 46 members · GRAD-1507", or the person's email (L2-172 AC1). */
export function holdLine(hold: AdminNotificationHold): string {
  if (hold.popkin) {
    const { members, inviteCode } = hold.popkin;
    return `Popkin · ${number(members)} ${plural(members, 'member')} · ${inviteCode}`;
  }
  return hold.person?.email ?? '';
}

/** "Aiko Tanaka · Sun 12 Jul", or "System · Mon 6 Jul" for an automatic hold. */
export function holdBy(hold: AdminNotificationHold, timeZone: string): string {
  const since = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(hold.since));
  return `${hold.byName} · ${since}`;
}

const UNTIL: Record<NotificationHoldUntil, string> = {
  UntilReleased: 'Until released',
  WhileSuspended: 'While suspended',
  UntilDeleted: 'Until deleted',
};

/** "Until released", "While suspended" or "Until deleted" (L2-172 AC1). */
export function holdUntil(until: NotificationHoldUntil): string {
  return UNTIL[until];
}

/** The sentence that ends Holds, with the provider's count once it is known (L2-172 AC6). */
export function heldNote(suppressedAddresses: number | null): string {
  const one = suppressedAddresses === 1;
  const bounced =
    suppressedAddresses === null
      ? 'Addresses that hard-bounced'
      : `${number(suppressedAddresses)} ${plural(suppressedAddresses, 'address', 'addresses')} that hard-bounced`;
  return `Suspended and deleting accounts are held automatically. ${bounced} ${one ? 'is' : 'are'} suppressed by the mail provider and ${one ? 'doesn’t' : 'don’t'} appear here.`;
}

/** "Hold Bakery Launch Crew?" (L2-172 AC2). */
export function holdDialog(name: string): NotificationDialogText {
  return {
    heading: `Hold ${name}?`,
    description:
      'Its members get no email or phone alerts from it until it is released. They aren’t told.',
    confirm: 'Hold',
    busy: 'Holding…',
    keep: 'Cancel',
    placeholder: 'e.g. Daily digest sending twice since 3.4.1',
  };
}

/** "Release the hold on Class of 2015 Reunion?" (L2-172 AC4; the title is gap 138's). */
export function releaseDialog(name: string): NotificationDialogText {
  return {
    heading: `Release the hold on ${name}?`,
    description:
      'Members here start getting email again, by their own settings, from the next change. Nothing held back is sent late.',
    confirm: 'Release hold',
    busy: 'Releasing…',
    keep: 'Keep it held',
    placeholder: 'e.g. Daily digest sending twice since 3.4.1',
  };
}

/** The search's notes: what it found nothing for (L2-172 AC2). */
export function holdSearchNotes(text: string, found: number): string[] {
  return text.trim() && found === 0
    ? [`No active Popkin matches “${text.trim()}”. Wrapped-up and held Popkins aren’t listed.`]
    : [];
}

export function heldToast(name: string): readonly [string, string] {
  return [`${name} is held`, 'Its members get no email or phone alerts from it.'];
}

export const RELEASED_TOAST = [
  'Hold released',
  'Members get email again from the next change.',
] as const;
