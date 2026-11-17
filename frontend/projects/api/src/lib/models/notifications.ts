import { AvatarView } from './invite';
import { ReminderLead } from './contacts';
import { PopkinColour } from './popkin';

/** The twelve kinds of notification of L2-154, as the API names them. */
export type NotificationKind =
  | 'MentionsAndReplies'
  | 'DirectMessages'
  | 'GroupChat'
  | 'NewPhotos'
  | 'PlanChanges'
  | 'ScheduleChanges'
  | 'PeopleJoining'
  | 'Experiences'
  | 'Birthdays'
  | 'StoriesDue'
  | 'PopkinWrappingUp'
  | 'SignInAndSecurity';

export type NotificationGroup = 'Activity' | 'Reminders' | 'Account';

export type NotificationFrequency = 'AsItHappens' | 'DailyDigest' | 'WeeklyDigest';

/** Whether activity email comes and how often; `available` is false with no email address (L2-156). */
export interface ActivityEmailView {
  on: boolean;
  available: boolean;
  frequency: NotificationFrequency;
}

/** One kind, in the words of the catalogue, with what the person gets of it. */
export interface NotificationKindView {
  kind: NotificationKind;
  name: string;
  about: string;
  email: boolean;
  phone: boolean;
  required: boolean;
  offForEveryone: boolean;
}

export interface NotificationGroupView {
  group: NotificationGroup;
  name: string;
  about: string;
  kinds: NotificationKindView[];
}

/** How much one Popkin tells the person (L2-158). */
export type PopkinNotificationLevel = 'Everything' | 'JustForMe' | 'Muted';

/** One active Popkin and the level the person keeps for it (L2-158 AC1). */
export interface PopkinLevelView {
  popkinId: string;
  name: string;
  emoji: string;
  colour: PopkinColour;
  people: number;
  /** When it wraps up; null for an ongoing Popkin. */
  endsAt: string | null;
  level: PopkinNotificationLevel;
}

/** A person the caller muted, and the Popkins the two share (L2-160 AC1). */
export interface MutedPersonView {
  muteId: string;
  name: string;
  avatar: AvatarView;
  sharedPopkins: string[];
}

/** Someone the caller could mute: they share an active Popkin (L2-160 AC2). */
export interface MuteCandidateView {
  membershipId: string;
  name: string;
  avatar: AvatarView;
  sharedPopkins: string[];
}

/** The Notifications screen in one read (`GET /api/me/notifications`, L2-155). */
/** One birthday on the People view, with its own lead and switch (L2-159 AC1). */
export interface BirthdayReminderView {
  keyDateId: string;
  contactId: string;
  name: string;
  photoUrl: string | null;
  initials: string;
  accent: PopkinColour;
  occursOn: string;
  turns: number | null;
  inDays: number;
  lead: ReminderLead;
  remindersOn: boolean;
}

export interface NotificationSettingsView {
  email: ActivityEmailView;
  groups: NotificationGroupView[];
  popkins: PopkinLevelView[];
  muted: MutedPersonView[];
  birthdays: BirthdayReminderView[];
  birthdayCount: number;
}
