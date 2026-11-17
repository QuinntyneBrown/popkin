import { Injectable, inject, signal } from '@angular/core';
import { NotificationSettingsView } from '../../models/notifications';
import { DelayedLoading } from '../loading/delayed-loading';
import { NOTIFICATIONS_API } from './notifications-api';

/** The three ways activity email can come, in the words of L2-156 AC1. */
export const FREQUENCY_CHOICES = [
  {
    value: 'AsItHappens',
    title: 'As it happens',
    sub: 'One email per change, bundled if several land within 10 minutes.',
  },
  {
    value: 'DailyDigest',
    title: 'Daily digest',
    sub: 'One email at 6 pm with everything from the day.',
  },
  { value: 'WeeklyDigest', title: 'Weekly digest', sub: 'Sunday evening, a round-up of the week.' },
] as const;

/**
 * The Notifications screen (docs/detailed-designs/notifications/notification-settings): the
 * person's settings, read in one request. One per screen; the page provides it.
 */
@Injectable()
export class NotificationSettingsStore {
  private readonly api = inject(NOTIFICATIONS_API);
  private readonly loading = new DelayedLoading();

  /** `pending` shows nothing yet; `loading` once 300 ms pass without an answer. */
  readonly state = this.loading.state;
  readonly settings = signal<NotificationSettingsView | null>(null);

  open(): void {
    this.loading.begin();
    this.api.settings().subscribe({
      next: (settings) => {
        this.settings.set(settings);
        this.loading.ready();
      },
      error: () => this.loading.failed(),
    });
  }
}
