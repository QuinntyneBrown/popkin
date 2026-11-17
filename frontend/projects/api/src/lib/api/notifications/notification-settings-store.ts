import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import {
  NotificationFrequency,
  NotificationKind,
  NotificationSettingsView,
} from '../../models/notifications';
import { DelayedLoading } from '../loading/delayed-loading';
import { Toaster } from '../toasts/toaster';
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

/** What a failed save says, as the control goes back (L2-155 AC5). */
export const SAVE_FAILED = 'We couldn’t save that. Try again.';

/** The banner after email is switched off (L2-156 AC3). */
export const UNSUBSCRIBED_TEXT =
  'You’re unsubscribed from all Popkin email. Sign-in codes still arrive, and your phone alerts are unchanged.';

export type NotificationChannel = 'email' | 'phone';

/**
 * The Notifications screen (docs/detailed-designs/notifications/notification-settings): the
 * person's settings, read in one request, and each change saved at once. A change shows at once;
 * if saving fails it goes back and a toast says so (L2-155 AC5). One per screen; the page
 * provides it.
 */
@Injectable()
export class NotificationSettingsStore {
  private readonly api = inject(NOTIFICATIONS_API);
  private readonly toaster = inject(Toaster);
  private readonly loading = new DelayedLoading();

  /** `pending` shows nothing yet; `loading` once 300 ms pass without an answer. */
  readonly state = this.loading.state;
  readonly settings = signal<NotificationSettingsView | null>(null);
  /** The banner the last change raised: email switched off (L2-156 AC3). */
  readonly banner = signal<'unsubscribed' | null>(null);

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

  /** Every email switch and the frequency are off and disabled while email is off (AC3). */
  emailBlocked(): boolean {
    const email = this.settings()?.email;
    return !email?.available || !email.on;
  }

  setKind(kind: NotificationKind, channel: NotificationChannel, on: boolean): void {
    this.change(
      (settings) => ({
        ...settings,
        groups: settings.groups.map((group) => ({
          ...group,
          kinds: group.kinds.map((k) => (k.kind === kind ? { ...k, [channel]: on } : k)),
        })),
      }),
      this.api.setKind(kind, { [channel]: on }),
    );
  }

  setEmail(on: boolean): void {
    this.change(
      (settings) => ({ ...settings, email: { ...settings.email, on } }),
      this.api.setEmail(on),
      () => this.banner.set(on ? null : 'unsubscribed'),
    );
  }

  setFrequency(frequency: NotificationFrequency): void {
    this.change(
      (settings) => ({ ...settings, email: { ...settings.email, frequency } }),
      this.api.setFrequency(frequency),
    );
  }

  dismissBanner(): void {
    this.banner.set(null);
  }

  private change(
    apply: (settings: NotificationSettingsView) => NotificationSettingsView,
    save: Observable<void>,
    saved?: () => void,
  ): void {
    const before = this.settings();
    if (!before) return;
    this.settings.set(apply(before));
    save.subscribe({
      complete: () => saved?.(),
      error: () => {
        this.settings.set(before);
        this.toaster.show('danger', SAVE_FAILED);
      },
    });
  }
}
