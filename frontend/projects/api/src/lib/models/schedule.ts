import { AvatarView } from './invite';

/** What one day of a member's week is (L2-072 AC2). */
export type TimeOffStatus = 'Off' | 'Tentative' | 'Working' | 'Weekend';

/** What the group is getting together for, set by the Host (L2-085). */
export interface EventView {
  label: string;
  firstDay: string;
  lastDay: string;
}

export interface TimeOffMemberView {
  membershipId: string;
  firstName: string;
  avatar: AvatarView;
  isMe: boolean;
  /** Monday to Sunday. */
  days: TimeOffStatus[];
}

/** A week of the group's time off, `GET …/schedule/time-off?week=` (L2-072). */
export interface TimeOffWeekView {
  /** The Monday, `YYYY-MM-DD`. */
  week: string;
  event: EventView | null;
  members: TimeOffMemberView[];
  /** The Popkin is active: a member may add their time off. */
  canEdit: boolean;
}
