import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AdminNotificationHold,
  AdminNotificationKind,
  AdminNotifications,
  HoldPopkinMatch,
} from '../../../models/admin';
import { ADMIN_PLATFORM_API } from './admin-platform-api';
import {
  AdminNotificationsStore,
  HOLD_SEARCH_DELAY_MS,
  NOTIFICATIONS_POLL_MS,
} from './admin-notifications.store';

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

const hold = (id: string | null, name: string): AdminNotificationHold => ({
  id,
  target: 'Popkin',
  automatic: id === null,
  popkin: { id: name, name, emoji: '🎓', colour: 'Plum', members: 3, inviteCode: 'AAAA-0001' },
  person: null,
  why: 'Spam',
  byName: 'Aiko Tanaka',
  since: '2026-07-12T09:00:00Z',
  until: 'UntilReleased',
});

describe('AdminNotificationsStore', () => {
  const notifications = vi.fn();
  const notificationHolds = vi.fn();
  const searchHoldPopkins = vi.fn();
  let store: AdminNotificationsStore;

  beforeEach(() => {
    vi.useFakeTimers();
    notifications.mockReturnValue(of(page()));
    notificationHolds.mockReturnValue(
      of({ holds: [hold('h1', 'Reunion'), hold(null, 'Ruth')], suppressedAddresses: null }),
    );
    TestBed.configureTestingModule({
      providers: [
        AdminNotificationsStore,
        {
          provide: ADMIN_PLATFORM_API,
          useValue: { notifications, notificationHolds, searchHoldPopkins },
        },
      ],
    });
    store = TestBed.inject(AdminNotificationsStore);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
    notifications.mockReset();
    notificationHolds.mockReset();
    searchHoldPopkins.mockReset();
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

  it('reads the holds when asked, and fails when it cannot (L2-172 AC1)', () => {
    expect(store.holdsStatus()).toBe('idle');
    store.loadHolds();
    expect(store.holdsStatus()).toBe('ready');
    expect(store.holds()?.holds.map((h) => h.id)).toEqual(['h1', null]);

    notificationHolds.mockReturnValue(throwError(() => new Error('down')));
    store.loadHolds();
    expect(store.holdsStatus()).toBe('failed');
  });

  it('reads the holds again with the page once they have been read', () => {
    store.load();
    vi.advanceTimersByTime(NOTIFICATIONS_POLL_MS);
    expect(notificationHolds).not.toHaveBeenCalled();

    store.loadHolds();
    notificationHolds.mockReturnValue(of({ holds: [], suppressedAddresses: 7 }));
    vi.advanceTimersByTime(NOTIFICATIONS_POLL_MS);
    expect(store.holds()?.suppressedAddresses).toBe(7);
  });

  it('puts an added hold first and drops a released one, counting both (L2-172 AC2, AC4)', () => {
    store.load();
    store.loadHolds();
    store.holdAdded(hold('h2', 'Bakery'));
    expect(store.holds()?.holds.map((h) => h.id)).toEqual(['h2', 'h1', null]);
    expect(store.holdCount()).toBe(5);

    store.holdReleased('h1');
    expect(store.holds()?.holds.map((h) => h.id)).toEqual(['h2', null]);
    expect(store.holdCount()).toBe(4);
  });

  const match = (name: string): HoldPopkinMatch => ({
    popkinId: name,
    name,
    emoji: '🥐',
    colour: 'Amber',
    inviteCode: 'CRMB-0093',
  });

  it('searches once typing rests, the newer text winning (L2-172 AC2)', () => {
    const slow = new Subject<HoldPopkinMatch[]>();
    searchHoldPopkins.mockImplementation((text: string) =>
      text === 'bak' ? slow : of([match('Bakery Launch Crew')]),
    );
    store.searchHolds('b');
    store.searchHolds('ba');
    vi.advanceTimersByTime(HOLD_SEARCH_DELAY_MS - 1);
    expect(searchHoldPopkins).not.toHaveBeenCalled();
    store.searchHolds('bak');
    vi.advanceTimersByTime(HOLD_SEARCH_DELAY_MS);
    expect(searchHoldPopkins).toHaveBeenCalledTimes(1);

    store.searchHolds(' bake ');
    vi.advanceTimersByTime(HOLD_SEARCH_DELAY_MS);
    slow.next([match('Stale')]);
    expect(searchHoldPopkins).toHaveBeenLastCalledWith('bake');
    expect(store.holdMatches().map((m) => m.name)).toEqual(['Bakery Launch Crew']);
    expect(store.holdNotes()).toEqual([]);
  });

  it('says when nothing matches, and finds nothing when the search fails', () => {
    searchHoldPopkins.mockReturnValue(throwError(() => new Error('down')));
    store.searchHolds('zzz');
    vi.advanceTimersByTime(HOLD_SEARCH_DELAY_MS);
    expect(store.holdMatches()).toEqual([]);
    expect(store.holdNotes()).toEqual([
      'No active Popkin matches “zzz”. Wrapped-up and held Popkins aren’t listed.',
    ]);
  });
});
