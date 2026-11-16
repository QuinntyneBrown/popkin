/** How many contacts I keep: the count line of every Contacts screen (L2-121, L2-126 AC1). */
export interface ContactsSummaryView {
  people: number;
}

/** The kind of tie I have with a contact (L2-129 AC1). */
export type ContactCircle = 'Family' | 'Friends' | 'Work' | 'Neighbours' | 'Clubs';

/** The circles in the order Add someone offers them. */
export const CONTACT_CIRCLES: readonly ContactCircle[] = [
  'Family',
  'Friends',
  'Work',
  'Neighbours',
  'Clubs',
];

/** What Add someone and Edit send as the part `contact` (L2-129, L2-130). */
export interface SaveContactRequest {
  /** Given by the web app to each save, so a resend saves once (L2-123 AC4). */
  clientId: string;
  name: string;
  knownAs: string;
  circle: ContactCircle | null;
  phone: string;
  email: string;
  city: string;
  howWeMet: string;
  loves: string[];
}

/**
 * A contact as their profile and the edit form show them (L2-128, L2-130). Their dates, habit,
 * connections, groups, counts and shared Popkin join as their designs are built.
 */
export interface ContactProfileView {
  id: string;
  name: string;
  firstName: string;
  initials: string;
  accent: string;
  photoUrl: string | null;
  knownAs: string | null;
  circle: ContactCircle | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  howWeMet: string | null;
  loves: string[];
  isClosest: boolean;
  /**
   * A Popkin we are both in, for a contact imported from an account (L2-128 AC2); absent until
   * Import reads it.
   */
  alsoIn?: ContactPopkinLink | null;
  /** Their key dates, soonest first, then those passed (L2-128 AC2). */
  keyDates?: ContactKeyDateView[];
}

/** "Also in your Popkin “Lakeside Weekend”": a Popkin I share with a contact. */
export interface ContactPopkinLink {
  popkinId: string;
  name: string;
}

/** A contact's soonest key date from the device's day (L2-126 AC3); joins with Key dates. */
export interface NextDateView {
  month: number;
  day: number;
  kind: string;
  title: string;
  inDays: number;
}

/** One row of People (L2-126 AC3). */
export interface ContactRowView {
  id: string;
  name: string;
  firstName: string;
  knownAs: string | null;
  circle: ContactCircle | null;
  isClosest: boolean;
  photoUrl: string | null;
  initials: string;
  accent: string;
  nextDate: NextDateView | null;
  lastTalkedOn: string | null;
  lastTalkedDays: number | null;
}

/** People: every contact I keep, A to Z (L2-126). */
export interface PeopleView {
  contacts: ContactRowView[];
}

/** What a key date marks (known gap 103, ruled); `Other` is "Something else". */
export type KeyDateKind = 'Birthday' | 'Anniversary' | 'Milestone' | 'Other';

/** How far ahead a key date's reminder comes (L2-138 AC1). */
export type ReminderLead =
  | 'OnTheDay'
  | 'OneDayBefore'
  | 'ThreeDaysBefore'
  | 'OneWeekBefore'
  | 'TwoWeeksBefore'
  | 'OneMonthBefore';

/** What Dates shows: everything, or one kind (L2-137 AC2). */
export type DatesFilter = 'all' | 'birthdays' | 'anniversaries' | 'milestones';

/** One key date on Dates: its next occurrence within a year (L2-137 AC1). */
export interface KeyDateRowView {
  id: string;
  contactId: string;
  firstName: string;
  photoUrl: string | null;
  initials: string;
  accent: string;
  kind: KeyDateKind;
  title: string | null;
  /** yyyy-MM-dd. */
  occursOn: string;
  daysLeft: number;
  /** The age or the years, when the first year is known. */
  years: number | null;
  lead: ReminderLead;
}

/** A key date as a profile shows it; `nextOn` is null once a one-off date has passed. */
export interface ContactKeyDateView {
  id: string;
  kind: KeyDateKind;
  title: string | null;
  month: number;
  day: number;
  year: number | null;
  everyYear: boolean;
  reminder: ReminderLead;
  nextOn: string | null;
  daysLeft: number | null;
}

/** My default lead time per kind and how reminders reach me (L2-139, L2-140). */
export interface ReminderPreferencesView {
  birthdayLead: ReminderLead;
  anniversaryLead: ReminderLead;
  milestoneLead: ReminderLead;
  phoneNotifications: boolean;
  mondayEmail: boolean;
}

export interface ContactDatesView {
  dates: KeyDateRowView[];
  preferences: ReminderPreferencesView;
}

/** Add a date (L2-138); with no `lead` the date takes my default for its kind. */
export interface AddKeyDateRequest {
  clientId: string;
  kind: KeyDateKind;
  title: string | null;
  month: number;
  day: number;
  year: number | null;
  everyYear: boolean;
  lead: ReminderLead;
}
