import { FollowUpView, HabitView, KeyDateRowView, TalkChannel } from './contacts';

/** The next date that matters, with what is known of whose it is (L2-125 AC2). */
export interface SpotlightView {
  date: KeyDateRowView;
  knownAs: string | null;
  phone: string | null;
  loves: string[];
  lastTime: string | null;
}

/** A conversation or milestone logged lately (L2-125 AC6). */
export interface RecentEntryView {
  entryId: string;
  contactId: string;
  firstName: string;
  initials: string;
  accent: string;
  photoUrl: string | null;
  kind: 'Conversation' | 'Milestone';
  channel: TalkChannel | null;
  title: string | null;
  note: string | null;
  /** yyyy-MM-dd. */
  day: string;
  daysAgo: number;
}

/** Someone not talked to in a while (L2-125 AC7). */
export interface DriftingView {
  contactId: string;
  firstName: string;
  initials: string;
  accent: string;
  photoUrl: string | null;
  daysSince: number;
}

/** Today (L2-125), read in one request for the device's day. */
export interface TodayView {
  firstName: string;
  people: number;
  next: SpotlightView | null;
  comingUp: KeyDateRowView[];
  followUps: FollowUpView[];
  overdueHabits: HabitView[];
  recently: RecentEntryView[];
  drifting: DriftingView[];
}
