import { AvatarView } from './invite';

/** A working stretch, "09:00" to "17:30"; midnight at the end is "24:00". */
export interface StretchView {
  start: string;
  end: string;
}

/** One evening of this week (L2-074 AC2 to AC4). */
export interface EveningView {
  /** `YYYY-MM-DD`. */
  date: string;
  freeCount: number;
  /** "19:30" when everyone is free; null when someone is working. */
  everyoneFreeFrom: string | null;
  lastOffShift: string[];
  working: string[];
}

export interface ThisWeekMemberView {
  membershipId: string;
  firstName: string;
  avatar: AvatarView;
  isMe: boolean;
  /** Seven days, each up to two stretches. */
  days: StretchView[][];
}

/** `PUT …/schedule/hours/{membershipId}`: seven days from `from`, each up to two stretches. */
export interface SetHoursBody {
  from: string;
  days: StretchView[][];
}

/** This week, `GET …/schedule/week?from=` (L2-074): seven days from the viewer's today. */
export interface ThisWeekView {
  from: string;
  memberCount: number;
  /** The Popkin is active: a member may enter their hours. */
  canEdit: boolean;
  days: EveningView[];
  members: ThisWeekMemberView[];
}
