import type { UploadEvent } from './photos';
import type { AroundView, ConnectionDraft } from './connections';
import type { GroupChipView } from './groups';
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
  /** "Dates to remember", saved with the contact; Edit leaves the dates alone without it. */
  keyDates?: KeyDateDraft[];
  /** "How they connect": connections made in the form, saved with the contact (L2-150 AC9). */
  connect?: ConnectionDraft[];
  /** Edit: the kept connections removed in the form. */
  disconnect?: string[];
  /** "Groups": every group the contact is in, set in full (L2-147 AC6). */
  groupIds?: string[];
}

/** What a key date is, however it is held: its kind, title and day (ADR 0029). */
export interface KeyDateFields {
  kind: KeyDateKind;
  title: string | null;
  month: number;
  day: number;
  year: number | null;
  everyYear: boolean;
}

/** A key date held by the contact form until "Save": `id` for one kept (L2-129 AC2). */
export interface KeyDateDraft extends KeyDateFields {
  id?: string;
  reminder: ReminderLead;
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
  /** What goes with them when they are deleted (L2-132 AC1); read with the profile. */
  kept?: ContactKeptView | null;
  /** Our habit, running, or none (L2-128 AC5). */
  habit?: HabitView | null;
  /** "People around {first name}": their connections (L2-150 AC4). */
  around?: AroundView[];
  /** Their groups, as chips on the profile (L2-146 AC4). */
  groups?: GroupChipView[];
}

/** A contact's timeline entries and memories, counted for Delete (L2-132 AC1). */
export interface ContactKeptView {
  timelineEntries: number;
  memories: number;
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
export interface ContactKeyDateView extends KeyDateFields {
  id: string;
  reminder: ReminderLead;
  nextOn: string | null;
  daysLeft: number | null;
  /** Off, the date stays and reminds of nothing (L2-159 AC4). */
  remindersOn: boolean;
}

/** My default lead time per kind (L2-139); how reminders reach me is set in Notifications. */
export interface ReminderPreferencesView {
  birthdayLead: ReminderLead;
  anniversaryLead: ReminderLead;
  milestoneLead: ReminderLead;
}

export interface ContactDatesView {
  dates: KeyDateRowView[];
  preferences: ReminderPreferencesView;
}

/** Add a date (L2-138); with no `lead` the date takes my default for its kind. */
export interface AddKeyDateRequest extends KeyDateFields {
  clientId: string;
  lead: ReminderLead;
}

/** How a conversation was had (L2-135). */
export type TalkChannel = 'InPerson' | 'Phone' | 'Video' | 'Messages';

/** A follow-up as Follow-ups and a profile list it (L2-141). */
export interface FollowUpView {
  id: string;
  text: string;
  contactId: string | null;
  contactFirstName: string | null;
  contactInitials: string | null;
  contactAccent: string | null;
  contactPhotoUrl: string | null;
  /** yyyy-MM-dd, or none. */
  dueOn: string | null;
  isPromise: boolean;
  promisedVia: TalkChannel | null;
  promisedOn: string | null;
  createdAt: string;
  doneAt: string | null;
}

/** "Add a follow-up" (L2-142 AC1): for nobody on Follow-ups, for the contact on a profile. */
export interface AddFollowUpRequest {
  clientId: string;
  text: string;
  contactId?: string | null;
  dueOn?: string | null;
}

/** Follow-ups' tabs (L2-141 AC2). */
export type FollowUpsFilter = 'everything' | 'promises';

/** A turn in a contact's life (L2-134 AC1). */
export type MilestoneKind =
  'NewJob' | 'Wedding' | 'NewBaby' | 'Moved' | 'Graduated' | 'SomethingElse';

export type TimelineEntryKind = 'Conversation' | 'Milestone' | 'Memory';

/** A profile's Timeline filter (L2-135 AC1). */
export type TimelineShow = 'all' | 'conversations' | 'milestones';

/** One row of a contact's timeline, newest first (L2-135 AC1). */
export interface TimelineItemView {
  id: string;
  kind: TimelineEntryKind;
  /** yyyy-MM-dd. */
  day: string;
  channel: TalkChannel | null;
  milestoneKind: MilestoneKind | null;
  title: string | null;
  note: string | null;
  /** A photo memory's thumbnail and photo (known gap 107, ruled). */
  thumbnailUrl?: string | null;
  photoUrl?: string | null;
}

export interface TimelineView {
  entries: TimelineItemView[];
}

/** A logged entry, and the key date a yearly milestone added. */
export interface TimelineEntryView {
  entry: TimelineItemView;
  keyDateId: string | null;
}

/** A promise made in a conversation, before it is saved (known gap 106, ruled). */
export interface PromiseDraft {
  text: string;
  /** yyyy-MM-dd. */
  dueOn: string;
}

/** "Talked with {first name}" (L2-133). */
export interface LogConversationRequest {
  clientId: string;
  channel: TalkChannel;
  /** The moment Log opened, with the device's offset. */
  loggedAt: string;
  note: string;
  promises: PromiseDraft[];
}

/** "{first name}'s milestone" (L2-134). */
export interface LogMilestoneRequest {
  clientId: string;
  kind: MilestoneKind;
  title: string;
  /** yyyy-MM-dd. */
  happenedOn: string;
  note: string | null;
  everyYear: boolean;
}

/** A photo kept about a contact (L2-136 AC1). */
export interface PhotoMemoryView {
  id: string;
  caption: string | null;
  /** yyyy-MM-dd: taken, or added. */
  day: string;
  thumbnailUrl: string;
  photoUrl: string;
}

/** A file kept about a contact (known gap 107, ruled). */
export interface FileMemoryView {
  id: string;
  fileName: string;
  /** yyyy-MM-dd. */
  addedOn: string;
  sizeBytes: number;
  downloadUrl: string;
}

/** A note kept about a contact (known gap 107, ruled). */
export interface NoteMemoryView {
  id: string;
  text: string;
  /** yyyy-MM-dd. */
  updatedOn: string;
}

/** "Memories & files" (L2-136 AC1): each kind newest first. */
export interface MemoriesView {
  photos: PhotoMemoryView[];
  files: FileMemoryView[];
  notes: NoteMemoryView[];
}

/** What to add to a contact's memories (L2-136 AC2). */
export type MemoryKind = 'photo' | 'file' | 'note';

/** A photo or file on its way: how much is sent, then what was kept. */
export type MemoryUploadEvent<T> = UploadEvent<{ sent: number; total: number }, { memory: T }>;

/** How often a habit comes round (L2-145). */
export type HabitRhythm = 'Weekly' | 'EveryTwoWeeks' | 'Monthly';

/** A day a habit was kept, with the id its Undo removes. */
export interface HabitKeptDay {
  id: string;
  /** yyyy-MM-dd. */
  on: string;
}

/** A running habit as Habits and a profile show it (L2-143, L2-128 AC5). */
export interface HabitView {
  id: string;
  contactId: string;
  contactFirstName: string;
  contactName: string;
  contactInitials: string;
  contactAccent: string;
  contactPhone: string | null;
  contactPhotoUrl: string | null;
  what: string;
  rhythm: HabitRhythm;
  /** yyyy-MM-dd, each. */
  startedOn: string;
  lastTime: string;
  dueOn: string;
  /** The days kept as far back as the strip reaches, newest first. */
  kept: HabitKeptDay[];
}

/** "We met up" kept: the keep Undo removes, and the habit due on (L2-144 AC1). */
export interface HabitKeptView {
  keptId: string;
  habit: HabitView;
}

/** "Start the habit" (L2-145 AC1). */
export interface StartHabitRequest {
  clientId: string;
  contactId: string;
  what: string;
  rhythm: HabitRhythm;
}

/**
 * A contact as a short row shows them: names, face, how they are known and their circle. The
 * connection map's people and a group's members share it (ADR 0029).
 */
export interface ContactSummaryView {
  contactId: string;
  firstName: string;
  fullName: string;
  initials: string;
  /** The contact's colour as the API names it: "Sky". */
  accent: string;
  photoUrl: string | null;
  knownAs: string | null;
  circle: ContactCircle | null;
}
