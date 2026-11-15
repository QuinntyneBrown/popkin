import { AdminRole } from '../../../models/admin';

/** What each role may do, in one line: the add dialog's cards and the roles view's foot. */
export const ROLE_SENTENCES: Record<AdminRole, string> = {
  Owner: 'Everything, including admins, features and limits.',
  Support: 'Helps people and Popkins, moderates content.',
  Viewer: 'Reads everything, changes nothing.',
};

/** "Make Aiko Tanaka a Viewer?" */
export function changeRoleHeading(name: string, role: AdminRole): string {
  return `Make ${name} ${role === 'Owner' ? 'an' : 'a'} ${role}?`;
}

/** What the change means for them, by their first name (L2-119 AC5). */
export function changeRoleSentence(name: string, from: AdminRole, to: AdminRole): string {
  const first = name.split(' ')[0];
  const then = 'It applies the next time they open a page.';
  if (to === 'Viewer') {
    return `${first} can still look at everything but can no longer help people, moderate or end calls. ${then}`;
  }
  if (to === 'Owner') {
    return `${first} can do everything, including adding and removing admins, features and limits. ${then}`;
  }
  return from === 'Owner'
    ? `${first} can still help people and Popkins but can no longer change admins, features or limits. ${then}`
    : `${first} can help people and Popkins, moderate content and end calls. ${then}`;
}

/** What removing them does, and the role they had (L2-119 AC6). */
export function removeSentence(role: AdminRole): string {
  return `They’re signed out of the console now and can’t sign back in. Their past actions stay in the audit log. They were ${role === 'Owner' ? 'an' : 'a'} ${role}.`;
}

/** "Now", "14 min ago", "2 hr ago", "Yesterday", "9 Jul", or that they have not signed in yet. */
export function lastActiveText(
  lastActiveAt: string | null,
  invited: boolean,
  now: Date,
  timeZone: string,
): string {
  if (invited || !lastActiveAt) return 'Invited · not signed in yet';
  const at = new Date(lastActiveAt);
  const minutes = Math.floor((now.getTime() - at.getTime()) / 60_000);
  if (minutes < 1) return 'Now';
  if (minutes < 60) return `${minutes} min ago`;
  const day = (date: Date) =>
    new Intl.DateTimeFormat('en-CA', { timeZone, dateStyle: 'short' }).format(date);
  if (day(at) === day(now)) return `${Math.floor(minutes / 60)} hr ago`;
  if (day(at) === day(new Date(now.getTime() - 86_400_000))) return 'Yesterday';
  return new Intl.DateTimeFormat('en-GB', { timeZone, day: 'numeric', month: 'short' }).format(at);
}
