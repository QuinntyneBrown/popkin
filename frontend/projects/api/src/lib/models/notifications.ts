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

/** The Notifications screen in one read (`GET /api/me/notifications`, L2-155). */
export interface NotificationSettingsView {
  email: ActivityEmailView;
  groups: NotificationGroupView[];
}
