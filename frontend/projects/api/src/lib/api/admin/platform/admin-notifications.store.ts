import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, map, of, switchMap } from 'rxjs';
import {
  AdminNotificationDefaults,
  AdminNotificationHold,
  AdminNotificationHolds,
  AdminNotificationKind,
  AdminNotifications,
  AdminSendStatus,
  HoldPopkinMatch,
} from '../../../models/admin';
import { ADMIN_PLATFORM_API } from './admin-platform-api';
import { holdSearchNotes } from './holds-text';
import { NotificationDefaultField, NotificationDefaultsDraft } from './notification-defaults-draft';

/** How often the page reads the status and the counts again (the admin app polls; ADR 0015). */
export const NOTIFICATIONS_POLL_MS = 60_000;

/** How long typing rests before "Hold a Popkin" searches. */
export const HOLD_SEARCH_DELAY_MS = 300;

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

  /** The Holds tab, read when it first opens (L2-172). */
  readonly holdsStatus = signal<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  readonly holds = signal<AdminNotificationHolds | null>(null);

  /** "Hold a Popkin"'s search: the text, the matches, and the text they answer (L2-172 AC2). */
  readonly holdSearch = signal('');
  readonly holdMatches = signal<HoldPopkinMatch[]>([]);
  private readonly holdAnswered = signal('');
  readonly holdNotes = computed(() =>
    holdSearchNotes(this.holdAnswered(), this.holdMatches().length),
  );
  private readonly searches = new Subject<string>();

  /** The Defaults tab: read when it first opens, then edited as a draft (L2-173). */
  readonly defaultsStatus = signal<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  readonly defaults = signal<NotificationDefaultsDraft | null>(null);

  constructor() {
    const poll = setInterval(() => this.refresh(), NOTIFICATIONS_POLL_MS);
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => clearInterval(poll));
    // A newer text cancels the search before it; a failed search finds nothing.
    this.searches
      .pipe(
        debounceTime(HOLD_SEARCH_DELAY_MS),
        switchMap((text) =>
          this.api.searchHoldPopkins(text.trim()).pipe(
            catchError(() => of<HoldPopkinMatch[]>([])),
            map((found) => ({ text, found })),
          ),
        ),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe(({ text, found }) => {
        this.holdAnswered.set(text);
        this.holdMatches.set(found);
      });
  }

  /** Searches active Popkins not held, by name or code, once typing rests (L2-172 AC2). */
  searchHolds(text: string): void {
    this.holdSearch.set(text);
    this.searches.next(text);
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

  /** Reads the page again quietly, and the holds once read; a failed poll keeps what shows. */
  refresh(): void {
    if (this.status() !== 'ready') return;
    this.api.notifications().subscribe({
      next: (notifications) => this.notifications.set(notifications),
      error: () => undefined,
    });
    if (this.holdsStatus() !== 'ready') return;
    this.api.notificationHolds().subscribe({
      next: (holds) => this.holds.set(holds),
      error: () => undefined,
    });
  }

  /** Reads the holds, showing them loading; "Try again" calls it too. */
  loadHolds(): void {
    this.holdsStatus.set('loading');
    this.api.notificationHolds().subscribe({
      next: (holds) => {
        this.holds.set(holds);
        this.holdsStatus.set('ready');
      },
      error: () => this.holdsStatus.set('failed'),
    });
  }

  /** A hold just added: first of the manual holds, and counted in the tab (L2-172 AC2). */
  holdAdded(hold: AdminNotificationHold): void {
    this.holds.update((h) => (h ? { ...h, holds: [hold, ...h.holds] } : h));
    this.countHolds(1);
  }

  /** A hold just released: gone from the list and the tab's count (L2-172 AC4). */
  holdReleased(holdId: string): void {
    this.holds.update((h) => (h ? { ...h, holds: h.holds.filter((x) => x.id !== holdId) } : h));
    this.countHolds(-1);
  }

  private countHolds(by: number): void {
    this.notifications.update((n) => (n ? { ...n, holdCount: Math.max(0, n.holdCount + by) } : n));
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

  /** Reads the defaults, showing them loading; "Try again" calls it too. */
  loadDefaults(): void {
    this.defaultsStatus.set('loading');
    this.api.notificationDefaults().subscribe({
      next: (saved) => {
        this.defaults.set(new NotificationDefaultsDraft(saved));
        this.defaultsStatus.set('ready');
      },
      error: () => this.defaultsStatus.set('failed'),
    });
  }

  /** A value typed or chosen (L2-173 AC3). */
  editDefault(field: NotificationDefaultField, value: string): void {
    this.defaults.update((d) => d?.with(field, value) ?? d);
  }

  /** Back to the saved defaults. */
  discardDefaults(): void {
    this.defaults.update((d) => d?.discarded() ?? d);
  }

  /** The defaults as saved: the new start, nothing unsaved (L2-173 AC4). */
  defaultsSaved(saved: AdminNotificationDefaults): void {
    this.defaults.set(new NotificationDefaultsDraft(saved));
  }
}
