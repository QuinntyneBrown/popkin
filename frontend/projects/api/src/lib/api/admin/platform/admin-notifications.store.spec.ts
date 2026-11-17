import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminNotificationKind, AdminNotifications } from '../../../models/admin';
import { ADMIN_PLATFORM_API } from './admin-platform-api';
import { AdminNotificationsStore, NOTIFICATIONS_POLL_MS } from './admin-notifications.store';

const kind = (
  name: string,
  change: Partial<AdminNotificationKind> = {},
): AdminNotificationKind => ({
  kind: name as AdminNotificationKind['kind'],
  name,
  about: '',
  required: false,
  offForEveryone: false,
  offSince: null,
  offByName: null,
  offReason: null,
  sent24h: 1,
  openedPercent: null,
  ...change,
});

const page = (sentToday = 10): AdminNotifications => ({
  status: {
    paused: false,
    pausedAt: null,
    pausedByName: null,
    pauseReason: null,
    queued: 0,
    resumeMinutes: null,
    sentToday,
    bouncedPercent: null,
    medianSecondsToInbox: null,
  },
  groups: [
    {
      group: 'Activity',
      name: 'When something changes',
      kinds: [kind('GroupChat'), kind('NewPhotos')],
    },
    {
      group: 'Account',
      name: 'Your account',
      kinds: [kind('SignInAndSecurity', { required: true })],
    },
  ],
  holdCount: 4,
});

describe('AdminNotificationsStore', () => {
  const notifications = vi.fn();
  let store: AdminNotificationsStore;

  beforeEach(() => {
    vi.useFakeTimers();
    notifications.mockReturnValue(of(page()));
    TestBed.configureTestingModule({
      providers: [
        AdminNotificationsStore,
        { provide: ADMIN_PLATFORM_API, useValue: { notifications } },
      ],
    });
    store = TestBed.inject(AdminNotificationsStore);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
    notifications.mockReset();
  });

  it('reads the page and counts the kinds and holds, and fails when it cannot (L2-169 AC1)', () => {
    store.load();
    expect(store.status()).toBe('ready');
    expect(store.kindCount()).toBe(3);
    expect(store.holdCount()).toBe(4);

    notifications.mockReturnValue(throwError(() => new Error('down')));
    store.load();
    expect(store.status()).toBe('failed');
  });

  it('reads the page again every minute, keeping what shows when a poll fails', () => {
    store.load();
    notifications.mockReturnValue(of(page(25)));
    vi.advanceTimersByTime(NOTIFICATIONS_POLL_MS);
    expect(store.sending()?.sentToday).toBe(25);

    notifications.mockReturnValue(throwError(() => new Error('down')));
    vi.advanceTimersByTime(NOTIFICATIONS_POLL_MS);
    expect(store.status()).toBe('ready');
    expect(store.sending()?.sentToday).toBe(25);
  });

  it('does not poll before the page has loaded', () => {
    vi.advanceTimersByTime(NOTIFICATIONS_POLL_MS);
    expect(notifications).not.toHaveBeenCalled();
  });

  it('takes a saved status and a saved kind in their places (L2-170, L2-171)', () => {
    store.load();
    store.statusSaved({ ...page().status, paused: true, queued: 3 });
    expect(store.sending()?.paused).toBe(true);

    store.kindSaved(kind('NewPhotos', { offForEveryone: true }));
    expect(store.groups()[0].kinds.map((k) => k.offForEveryone)).toEqual([false, true]);
    expect(store.kindCount()).toBe(3);
  });
});
