import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { AdminNotificationKind, AdminNotifications, AdminSendStatus } from '../../../models/admin';
import { ADMIN_PLATFORM_API } from './admin-platform-api';

/** How often the page reads the status and the counts again (the admin app polls; ADR 0015). */
export const NOTIFICATIONS_POLL_MS = 60_000;

/**
 * The Notifications page (docs/detailed-designs/admin-platform/notifications). One per page: it
 * reads the status and the kinds, reads them again every minute while the page is open, and
 * takes each saved change in its place.
 */
@Injectable()
export class AdminNotificationsStore {
  private readonly api = inject(ADMIN_PLATFORM_API);

  readonly status = signal<'loading' | 'ready' | 'failed'>('loading');
  readonly notifications = signal<AdminNotifications | null>(null);

  readonly sending = computed(() => this.notifications()?.status ?? null);
  readonly groups = computed(() => this.notifications()?.groups ?? []);
  readonly kindCount = computed(() => this.groups().reduce((n, g) => n + g.kinds.length, 0));
  readonly holdCount = computed(() => this.notifications()?.holdCount ?? 0);

  constructor() {
    const poll = setInterval(() => this.refresh(), NOTIFICATIONS_POLL_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(poll));
  }

  /** Reads the page, showing it loading; "Try again" calls it too. */
  load(): void {
    this.status.set('loading');
    this.api.notifications().subscribe({
      next: (notifications) => {
        this.notifications.set(notifications);
        this.status.set('ready');
      },
      error: () => this.status.set('failed'),
    });
  }

  /** Reads the page again quietly; a failed poll keeps what shows. */
  refresh(): void {
    if (this.status() !== 'ready') return;
    this.api.notifications().subscribe({
      next: (notifications) => this.notifications.set(notifications),
      error: () => undefined,
    });
  }

  /** The status as a pause or a resume saved it (L2-170). */
  statusSaved(status: AdminSendStatus): void {
    this.notifications.update((n) => (n ? { ...n, status } : n));
  }

  /** A kind as its switch saved it, in its row's place (L2-171). */
  kindSaved(kind: AdminNotificationKind): void {
    this.notifications.update((n) =>
      n
        ? {
            ...n,
            groups: n.groups.map((g) => ({
              ...g,
              kinds: g.kinds.map((k) => (k.kind === kind.kind ? kind : k)),
            })),
          }
        : n,
    );
  }
}
