import { GroupKindName, GroupMemberView } from '../../models/groups';
import { lastTalked } from './people-text';

/** The list's headings (L2-146 AC1). */
export const GROUP_KIND_HEADINGS: Record<GroupKindName, string> = {
  Household: 'Households',
  SmallGroup: 'Small groups',
  Team: 'Teams',
  Club: 'Clubs',
};

/** One kind, over an open group's name and in New group's "What kind". */
export const GROUP_KIND_LABELS: Record<GroupKindName, string> = {
  Household: 'Household',
  SmallGroup: 'Small group',
  Team: 'Team',
  Club: 'Club',
};

export const GROUP_NAME_ERROR = 'Give the group a name, like “Book club”.';
export const GROUP_NAME_SUMMARY = 'Name: give the group a name.';
export const GROUP_NAME_MAX = 40;
export const GROUP_NAME_TOO_LONG = 'Keep it to 40 characters.';
export const GROUP_NOTE_MAX = 500;
export const GROUP_NOTE_TOO_LONG = 'Keep the note to 500 characters.';

/** "4 people", "1 person". */
export function groupPeople(n: number): string {
  return n === 1 ? '1 person' : `${n} people`;
}

/** "Open “Thursday Night Group”" (L2-148 AC1). */
export function openPopkin(name: string): string {
  return `Open “${name}”`;
}

/** "Add 2 people"; "Add people" with nobody new ticked (L2-147 AC3). */
export function addPeopleLabel(n: number): string {
  if (n === 0) return 'Add people';
  return n === 1 ? 'Add 1 person' : `Add ${n} people`;
}

/** "Add people to Thursday Night Group"; "Add people to the group" before it has a name (L2-147 AC4). */
export function addPeopleTitle(group: string): string {
  const name = group.trim();
  return name ? `Add people to ${name}` : 'Add people to the group';
}

/** "Take Grace out" (L2-147 AC1). */
export function takeOutLabel(firstName: string): string {
  return `Take ${firstName} out`;
}

/** "Walt, Ellie, Ruth, Joel" under a group's name. */
export function memberNames(members: readonly Pick<GroupMemberView, 'firstName'>[]): string {
  return members.map((m) => m.firstName).join(', ');
}

/** How the person knows a member: their Known as, else their circle (L2-146 AC5). */
export function howKnown(member: Pick<GroupMemberView, 'knownAs' | 'circle'>): string | null {
  return member.knownAs ?? member.circle;
}

/** When they last talked, as People reads it (L2-146 AC5). */
export function memberLastTalked(
  member: Pick<GroupMemberView, 'lastTalkedOn' | 'lastTalkedDays'>,
): string {
  return lastTalked(member.lastTalkedOn, member.lastTalkedDays);
}
