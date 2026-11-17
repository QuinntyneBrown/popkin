import {
  AdminNotificationDefaults,
  DefaultActivityEmail,
  DefaultBirthdayLead,
  NotificationDefaultsChange,
} from '../../../models/admin';
import { NotificationDialogText } from './notifications-text';

/** A default the Defaults tab edits (docs/detailed-designs/admin-platform/notification-defaults). */
export type NotificationDefaultField =
  'activityEmail' | 'bundleMinutes' | 'mostEmailsPerDay' | 'quietFrom' | 'quietTo' | 'birthdayLead';

/** The draft as the fields hold it: numbers and times as typed. */
export type NotificationDefaultsText = Record<NotificationDefaultField, string>;

/** One unsaved change, as the save dialog lists it: "Bundle changes within: 10 → 20 minutes". */
export interface NotificationDefaultChange {
  name: string;
  from: string;
  to: string;
  unit: string;
}

export const ACTIVITY_EMAILS: readonly { value: DefaultActivityEmail; label: string }[] = [
  { value: 'AsItHappens', label: 'As it happens' },
  { value: 'DailyDigest', label: 'Daily digest' },
  { value: 'WeeklyDigest', label: 'Weekly digest' },
];

/** The five leads L2-173 AC2 allows, without the longer ones a person may choose for a date. */
export const BIRTHDAY_LEADS: readonly { value: DefaultBirthdayLead; label: string }[] = [
  { value: 'Off', label: 'Off' },
  { value: 'OnTheDay', label: 'On the day' },
  { value: 'OneDayBefore', label: '1 day before' },
  { value: 'ThreeDaysBefore', label: '3 days before' },
  { value: 'OneWeekBefore', label: '1 week before' },
];

const WHOLE = /^\d+$/;
/** A time on the hour or half hour: "21:00", "07:30". */
const TIME = /^([01]\d|2[0-3]):(00|30)$/;

const RANGES = {
  bundleMinutes: { min: 1, max: 60 },
  mostEmailsPerDay: { min: 1, max: 100 },
} as const;

const label = <T extends string>(list: readonly { value: T; label: string }[], value: string) =>
  list.find((o) => o.value === value)?.label ?? value;

function textOf(saved: AdminNotificationDefaults): NotificationDefaultsText {
  return {
    activityEmail: saved.activityEmail,
    bundleMinutes: String(saved.bundleMinutes),
    mostEmailsPerDay: String(saved.mostEmailsPerDay),
    quietFrom: saved.quietFrom,
    quietTo: saved.quietTo,
    birthdayLead: saved.birthdayLead,
  };
}

/**
 * The Defaults tab's draft (L2-173): the saved defaults, the values as typed, each value's error,
 * how many defaults are unsaved and what changes. Immutable: `with` gives a new draft. Quiet hours
 * are one default with two fields. The rules are `NotificationDefaultsRules`' (ADR 0011).
 */
export class NotificationDefaultsDraft {
  readonly values: NotificationDefaultsText;

  constructor(
    readonly saved: AdminNotificationDefaults,
    values?: NotificationDefaultsText,
  ) {
    this.values = values ?? textOf(saved);
  }

  /** The draft with one field changed. */
  with(field: NotificationDefaultField, value: string): NotificationDefaultsDraft {
    return new NotificationDefaultsDraft(this.saved, { ...this.values, [field]: value });
  }

  /** The draft back at the saved values. */
  discarded(): NotificationDefaultsDraft {
    return new NotificationDefaultsDraft(this.saved);
  }

  /** What is wrong with a field's value, or null (L2-173 AC3). */
  error(field: NotificationDefaultField): string | null {
    const value = this.values[field].trim();
    switch (field) {
      case 'bundleMinutes':
      case 'mostEmailsPerDay': {
        const { min, max } = RANGES[field];
        const n = Number(value);
        return WHOLE.test(value) && n >= min && n <= max
          ? null
          : `Enter a whole number from ${min} to ${max}.`;
      }
      case 'quietFrom':
      case 'quietTo':
        if (!TIME.test(value)) return 'Enter a time on the hour or half hour, such as 21:00.';
        // Equal start and end is refused until its meaning is settled (the design's gap).
        return field === 'quietTo' && value === this.values.quietFrom.trim()
          ? 'Quiet hours can’t start and end at the same time.'
          : null;
      case 'activityEmail':
        return ACTIVITY_EMAILS.some((o) => o.value === value) ? null : 'Choose how often.';
      case 'birthdayLead':
        return BIRTHDAY_LEADS.some((o) => o.value === value) ? null : 'Choose how early.';
    }
  }

  get valid(): boolean {
    return (Object.keys(this.values) as NotificationDefaultField[]).every((f) => !this.error(f));
  }

  /** What changes, one row per default, quiet hours as one (L2-173 AC4). */
  get changes(): NotificationDefaultChange[] {
    const saved = textOf(this.saved);
    const now = this.normalised();
    const changes: NotificationDefaultChange[] = [];
    if (now.activityEmail !== saved.activityEmail) {
      changes.push({
        name: 'Activity email',
        from: label(ACTIVITY_EMAILS, saved.activityEmail),
        to: label(ACTIVITY_EMAILS, now.activityEmail),
        unit: '',
      });
    }
    if (now.bundleMinutes !== saved.bundleMinutes) {
      changes.push({
        name: 'Bundle changes within',
        from: saved.bundleMinutes,
        to: now.bundleMinutes,
        unit: 'minutes',
      });
    }
    if (now.mostEmailsPerDay !== saved.mostEmailsPerDay) {
      changes.push({
        name: 'Most emails per person per day',
        from: saved.mostEmailsPerDay,
        to: now.mostEmailsPerDay,
        unit: 'emails',
      });
    }
    if (now.quietFrom !== saved.quietFrom || now.quietTo !== saved.quietTo) {
      changes.push({
        name: 'Quiet hours',
        from: `${saved.quietFrom} to ${saved.quietTo}`,
        to: `${now.quietFrom} to ${now.quietTo}`,
        unit: '',
      });
    }
    if (now.birthdayLead !== saved.birthdayLead) {
      changes.push({
        name: 'Birthday reminders',
        from: label(BIRTHDAY_LEADS, saved.birthdayLead),
        to: label(BIRTHDAY_LEADS, now.birthdayLead),
        unit: '',
      });
    }
    return changes;
  }

  /** How many defaults differ from the saved ones. */
  get unsaved(): number {
    return this.changes.length;
  }

  /** The body of `PUT /api/admin/notifications/defaults`, without the reason. */
  request(): NotificationDefaultsChange {
    const now = this.normalised();
    return {
      activityEmail: now.activityEmail as DefaultActivityEmail,
      bundleMinutes: Number(now.bundleMinutes),
      mostEmailsPerDay: Number(now.mostEmailsPerDay),
      quietFrom: now.quietFrom,
      quietTo: now.quietTo,
      birthdayLead: now.birthdayLead as DefaultBirthdayLead,
    };
  }

  /** Trimmed, with whole numbers written plainly ("020" is "20"). */
  private normalised(): NotificationDefaultsText {
    const v = this.values;
    const whole = (s: string) => (WHOLE.test(s.trim()) ? String(Number(s.trim())) : s.trim());
    return {
      activityEmail: v.activityEmail,
      bundleMinutes: whole(v.bundleMinutes),
      mostEmailsPerDay: whole(v.mostEmailsPerDay),
      quietFrom: v.quietFrom.trim(),
      quietTo: v.quietTo.trim(),
      birthdayLead: v.birthdayLead,
    };
  }
}

/** The Activity email's help for the chosen frequency (L2-173 AC1). */
export function activityEmailHelp(choice: string, bundleMinutes: number): string {
  switch (choice) {
    case 'DailyDigest':
      return 'One email a day at 6 pm with everything that changed.';
    case 'WeeklyDigest':
      return 'One email on Sundays at 6 pm with everything that changed that week.';
    default:
      return `One email per change, bundled if several land within ${bundleMinutes} minutes.`;
  }
}

/** "Save new defaults?" (L2-173 AC4, L2-087 AC1). */
export const SAVE_DEFAULTS_DIALOG: NotificationDialogText = {
  heading: 'Save new defaults?',
  description: 'These apply within a minute to every member who hasn’t chosen their own:',
  confirm: 'Save',
  busy: 'Saving…',
  keep: 'Cancel',
  placeholder: 'For example: fewer, fuller emails',
};

export const DEFAULTS_SAVED_TOAST: [string, string] = [
  'Defaults saved',
  'They apply within a minute to members who haven’t chosen their own.',
];

/** The panel's foot: who changed the defaults last and when, or "Nothing changed yet.". */
export function defaultsFoot(
  saved: AdminNotificationDefaults,
  now: Date,
  timeZone: string,
): string {
  if (!saved.changedAt || !saved.changedByName) return 'Nothing changed yet.';
  const day = (date: Date, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-GB', { timeZone, ...options }).format(date);
  const at = new Date(saved.changedAt);
  const ymd = { year: 'numeric', month: '2-digit', day: '2-digit' } as const;
  const when =
    day(at, ymd) === day(now, ymd)
      ? 'today'
      : day(at, { weekday: 'short', day: 'numeric', month: 'short' });
  return `Last changed ${when} by ${saved.changedByName}.`;
}
