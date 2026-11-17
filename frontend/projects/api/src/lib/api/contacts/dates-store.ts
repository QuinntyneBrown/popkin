import { Injectable, computed, inject, signal } from '@angular/core';
import {
  DatesFilter,
  KeyDateRowView,
  ReminderLead,
  ReminderPreferencesView,
} from '../../models/contacts';
import { Toaster } from '../toasts/toaster';
import { CONTACTS_API } from './contacts-api';
import { dayParam } from './contacts-text';
import { monthGroups } from './contact-dates-text';
import { ContactsPageState } from './people-store';

/** The defaults Dates shows until it has read mine (L2-139 AC1). */
export const DEFAULT_REMINDERS: ReminderPreferencesView = {
  birthdayLead: 'OneWeekBefore',
  anniversaryLead: 'ThreeDaysBefore',
  milestoneLead: 'OnTheDay',
};

export const PREFERENCES_FAILED_HEADING = 'We couldn’t save your reminder settings';
export const PREFERENCES_FAILED_TEXT = 'Check your connection and try again.';

/**
 * Dates (docs/detailed-designs/contacts/key-dates): the next occurrence of each key date, by
 * month, narrowed by kind, with my default lead times (L2-137, L2-139). One per screen.
 */
@Injectable()
export class DatesStore {
  private readonly api = inject(CONTACTS_API);
  private readonly toaster = inject(Toaster);
  private day = new Date();

  readonly state = signal<ContactsPageState>('loading');
  readonly filter = signal<DatesFilter>('all');
  readonly dates = signal<KeyDateRowView[]>([]);
  readonly preferences = signal<ReminderPreferencesView>(DEFAULT_REMINDERS);
  /** Nothing at all yet: "No dates yet", without the reminder settings (L2-137 AC4). */
  readonly empty = computed(
    () => this.state() === 'ready' && this.filter() === 'all' && this.dates().length === 0,
  );
  readonly months = computed(() => monthGroups(this.dates(), this.day));

  open(day: Date = new Date()): void {
    this.day = day;
    this.load();
  }

  show(filter: DatesFilter): void {
    if (filter === this.filter()) return;
    this.filter.set(filter);
    this.load();
  }

  retry(): void {
    this.load();
  }

  /**
   * A changed default, saved at once; kept on screen if it fails, with a message saying so
   * (L2-139 AC2, L2-124 AC3).
   */
  changeDefault(
    key: 'birthdayLead' | 'anniversaryLead' | 'milestoneLead',
    lead: ReminderLead,
  ): void {
    this.save({ ...this.preferences(), [key]: lead });
  }

  private save(preferences: ReminderPreferencesView): void {
    this.preferences.set(preferences);
    this.api.saveReminderPreferences(preferences).subscribe({
      error: () => this.toaster.show('danger', PREFERENCES_FAILED_HEADING, PREFERENCES_FAILED_TEXT),
    });
  }

  private load(): void {
    this.state.set('loading');
    this.api.dates(dayParam(this.day), this.filter()).subscribe({
      next: (view) => {
        this.dates.set(view.dates);
        this.preferences.set(view.preferences);
        this.state.set('ready');
      },
      error: () => this.state.set('failed'),
    });
  }
}
