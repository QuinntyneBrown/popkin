import type { ContactCircle, KeyDateRowView } from './contacts';

/** A group's kind, in the order Groups lists them (L2-146 AC1). */
export type GroupKindName = 'Household' | 'SmallGroup' | 'Team' | 'Club';

export const GROUP_KINDS: readonly GroupKindName[] = ['Household', 'SmallGroup', 'Team', 'Club'];

/** A member of a group (L2-146 AC2, AC5). */
export interface GroupMemberView {
  contactId: string;
  firstName: string;
  fullName: string;
  initials: string;
  accent: string;
  photoUrl: string | null;
  knownAs: string | null;
  circle: ContactCircle | null;
  /** yyyy-MM-dd of the latest conversation, or null. */
  lastTalkedOn: string | null;
  lastTalkedDays: number | null;
}

/** A group as Groups lists and opens it (L2-146). */
export interface GroupView {
  id: string;
  name: string;
  kind: GroupKindName;
  emoji: string;
  accent: string;
  note: string | null;
  members: GroupMemberView[];
  comingUp: KeyDateRowView[];
  /** The Popkin it opens while the person is in it (L2-148 AC1, AC4). */
  popkin: { id: string; name: string } | null;
}

/** A group's chip on a profile (L2-146 AC4). */
export interface GroupChipView {
  id: string;
  name: string;
  emoji: string;
  accent: string;
}

/** "Make the group" (L2-147). */
export interface MakeGroupRequest {
  clientId: string;
  name: string;
  kind: GroupKindName;
  note: string | null;
  contactIds: string[];
}
