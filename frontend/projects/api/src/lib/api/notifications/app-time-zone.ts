import { Injectable, effect, inject } from '@angular/core';
import { SessionStore } from '../auth/session.store';
import { NOTIFICATIONS_API } from './notifications-api';

/** The device's IANA zone, as the browser knows it. */
export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Saves where the person is once the app knows who they are, once per start, so reminders at
 * 8 am and quiet hours are kept where they are (L2-161 AC7). A failure is quiet: the zone saved
 * before, or UTC, stands until the next start.
 */
@Injectable({ providedIn: 'root' })
export class AppTimeZone {
  private readonly api = inject(NOTIFICATIONS_API);
  private readonly sessions = inject(SessionStore);
  private saved = false;

  start(): void {
    effect(() => {
      if (this.saved || !this.sessions.session()) return;
      this.saved = true;
      this.api.saveTimeZone(deviceTimeZone()).subscribe({ error: () => undefined });
    });
  }
}
