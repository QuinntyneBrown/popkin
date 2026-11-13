import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageView } from '../../models/chat';
import { ActivePopkinView, MyPopkinsView, WrappedUpPopkinView } from '../../models/my-popkins';
import { AUTH_API } from '../auth/auth-api';
import { SessionStore } from '../auth/session.store';
import { NETWORK_STATUS } from '../chat/network-status';
import { ErrorScreens } from '../error-screens';
import { POPKIN_REALTIME } from '../realtime/popkin-realtime';
import { MyPopkinsStore } from './my-popkins-store';
import { POPKINS_SNAPSHOT, PopkinsSnapshot } from './popkins-snapshot';
import { POPKINS_API } from './popkins-api';

const avatar = (initials: string, photoUrl: string | null = null) =>
  ({ initials, accent: 'Coral', photoUrl }) as const;

const lakeside: ActivePopkinView = {
  id: 'lakeside',
  name: 'Lakeside Weekend',
  emoji: '🏕️',
  colour: 'Teal',
  endsAt: new Date(2026, 8, 13, 18, 0).toISOString(),
  memberCount: 14,
  avatars: [avatar('MO', '/photos/mara?sig=1'), avatar('WB'), avatar('PS')],
  latestMessage: { firstName: 'Mara', text: 'last call for the canoe sign-up' },
  unreadCount: 3,
  everyoneThreadId: 't-lakeside',
  viewerMembershipId: 'm-mara',
};
const thursday: ActivePopkinView = {
  id: 'thursday',
  name: 'Thursday Night Group',
  emoji: '🕯️',
  colour: 'Amber',
  endsAt: null,
  memberCount: 2,
  avatars: [avatar('WB'), avatar('MO')],
  latestMessage: null,
  unreadCount: 0,
  everyoneThreadId: 't-thursday',
  viewerMembershipId: 'm-mara-2',
};
const build: WrappedUpPopkinView = {
  id: 'build',
  name: 'Build Weekend ’26',
  emoji: '💻',
  colour: 'Sky',
  wrappedUpAt: new Date(2026, 2, 8).toISOString(),
  peopleCount: 48,
  photoCount: 312,
};
const both: MyPopkinsView = { active: [lakeside, thursday], wrappedUp: [build] };

const from = (threadId: string, membershipId: string, firstName: string, text: string) =>
  ({
    id: `${threadId}-${text}`,
    threadId,
    clientMessageId: null,
    kind: 'Member',
    author: { membershipId, firstName, avatar: avatar('XX') },
    text,
    sentAt: new Date(2026, 8, 12, 12, 1).toISOString(),
  }) as MessageView;

describe('MyPopkinsStore', () => {
  let answer: MyPopkinsView | 'down' | 'unreachable';
  let asked: number;
  let online: ReturnType<typeof signal<boolean>>;
  let backOnline: Subject<void>;
  let messages: Subject<MessageView>;
  let joined: Subject<unknown>;
  let reconnected: Subject<void>;
  let saved: Map<string, MyPopkinsView>;
  let offlineShown: string[];
  let store: MyPopkinsStore;

  const listMine = (): Observable<MyPopkinsView> => {
    asked++;
    if (answer === 'down') return throwError(() => new HttpErrorResponse({ status: 500 }));
    if (answer === 'unreachable') return throwError(() => new HttpErrorResponse({ status: 0 }));
    return of(answer);
  };

  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(2026, 8, 12, 12, 0) });
    answer = both;
    asked = 0;
    online = signal(true);
    backOnline = new Subject();
    messages = new Subject();
    joined = new Subject();
    reconnected = new Subject();
    saved = new Map();
    offlineShown = [];
    const snapshot: PopkinsSnapshot = {
      read: (personId) => saved.get(personId) ?? null,
      write: (personId, view) => void saved.set(personId, view),
      clear: () => saved.clear(),
    };
    TestBed.configureTestingModule({
      providers: [
        MyPopkinsStore,
        { provide: POPKINS_API, useValue: { listMine } },
        { provide: AUTH_API, useValue: {} },
        { provide: NETWORK_STATUS, useValue: { online, backOnline$: backOnline } },
        { provide: POPKINS_SNAPSHOT, useValue: snapshot },
        {
          provide: ErrorScreens,
          useValue: { showOffline: (url: string) => offlineShown.push(url) },
        },
        {
          provide: POPKIN_REALTIME,
          useValue: {
            messageAdded$: messages,
            threadRead$: new Subject<string>(),
            memberJoined$: joined,
            reconnected$: reconnected,
            start: vi.fn(),
          },
        },
      ],
    });
    TestBed.inject(SessionStore).set({ personId: 'mara', name: 'Mara Okafor', photoUrl: null });
    store = TestBed.inject(MyPopkinsStore);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('is loading until the Popkins arrive', () => {
    expect(store.state()).toBe('loading');
  });

  it('shows each active Popkin as a card, in the order the API gave', () => {
    store.open();
    expect(store.state()).toBe('ready');
    expect(store.cards()).toEqual([
      {
        id: 'lakeside',
        name: 'Lakeside Weekend',
        emoji: '🏕️',
        accent: 'teal',
        latest: 'Mara: last call for the canoe sign-up',
        avatars: lakeside.avatars,
        more: 11,
        members: '14 members',
        timeLeft: '1 day 6 hrs left',
        badge: '3',
        badgeLabel: '3 unread messages',
      },
      {
        id: 'thursday',
        name: 'Thursday Night Group',
        emoji: '🕯️',
        accent: 'amber',
        latest: 'No messages yet',
        avatars: thursday.avatars,
        more: 0,
        members: '2 members',
        timeLeft: 'Ongoing',
        badge: null,
        badgeLabel: null,
      },
    ]);
  });

  it('lists the wrapped-up Popkins', () => {
    store.open();
    expect(store.wrapped()).toEqual([
      {
        id: 'build',
        name: 'Build Weekend ’26',
        emoji: '💻',
        accent: 'sky',
        line: 'Wrapped Mar 8 · 48 people · 312 photos',
      },
    ]);
  });

  it('is empty for a person who belongs to no Popkin', () => {
    answer = { active: [], wrappedUp: [] };
    store.open();
    expect(store.state()).toBe('empty');
  });

  it('is ready with only wrapped-up Popkins', () => {
    answer = { active: [], wrappedUp: [build] };
    store.open();
    expect(store.state()).toBe('ready');
    expect(store.cards()).toEqual([]);
  });

  it('says so when the Popkins did not load, and reads again on retry', () => {
    answer = 'down';
    store.open();
    expect(store.state()).toBe('error');
    answer = both;
    store.retry();
    expect(store.state()).toBe('ready');
  });

  it('keeps the chrome when the API cannot be reached with the device online', () => {
    answer = 'unreachable';
    store.open();
    expect(store.state()).toBe('error');
    expect(offlineShown).toEqual([]);
  });

  describe('a message arriving', () => {
    beforeEach(() => store.open());

    it('raises the badge of its Popkin, shows it as the latest and moves the card first', () => {
      messages.next(from('t-thursday', 'm-walt', 'Walt', 'Same time next week?'));
      const [first, second] = store.cards();
      expect(first).toMatchObject({
        id: 'thursday',
        latest: 'Walt: Same time next week?',
        badge: '1',
        badgeLabel: '1 unread message',
      });
      expect(second.id).toBe('lakeside');
    });

    it('does not count the member’s own message', () => {
      messages.next(from('t-lakeside', 'm-mara', 'Mara', 'on my way'));
      expect(store.cards()[0]).toMatchObject({ latest: 'Mara: on my way', badge: '3' });
    });

    it('shows 99+ above 99', () => {
      answer = { active: [{ ...lakeside, unreadCount: 99 }], wrappedUp: [] };
      store.retry();
      messages.next(from('t-lakeside', 'm-walt', 'Walt', 'one more'));
      expect(store.cards()[0]).toMatchObject({
        badge: '99+',
        badgeLabel: 'More than 99 unread messages',
      });
    });

    it('leaves the list alone when it is a note of the system', () => {
      messages.next({ ...from('t-thursday', 'm-walt', 'Walt', 'popped in'), kind: 'System' });
      expect(store.cards()[0].id).toBe('lakeside');
      expect(store.cards()[1].latest).toBe('No messages yet');
    });

    it('is ignored for a thread the list does not hold', () => {
      messages.next(from('t-elsewhere', 'm-walt', 'Walt', 'hello'));
      expect(store.cards().map((card) => card.id)).toEqual(['lakeside', 'thursday']);
    });
  });

  it('reads again, keeping what is shown, when someone joins or the connection returns', () => {
    store.open();
    answer = 'down';
    joined.next({ popkinId: 'lakeside' });
    reconnected.next();
    expect(asked).toBe(3);
    expect(store.state()).toBe('ready');
    expect(store.cards()).toHaveLength(2);
  });

  it('redraws the time left each minute', () => {
    answer = {
      active: [{ ...lakeside, endsAt: new Date(2026, 8, 12, 12, 42).toISOString() }],
      wrappedUp: [],
    };
    store.open();
    expect(store.cards()[0].timeLeft).toBe('42 min left');
    vi.advanceTimersByTime(60_000);
    expect(store.cards()[0].timeLeft).toBe('41 min left');
  });

  describe('offline', () => {
    it('saves the list it read, without the photo addresses that expire', () => {
      store.open();
      expect(saved.get('mara')?.active[0].avatars[0]).toEqual(avatar('MO'));
      expect(saved.get('mara')?.wrappedUp).toEqual([build]);
    });

    it('shows what it saved last time, and says it is offline', () => {
      store.open();
      const again = TestBed.runInInjectionContext(() => new MyPopkinsStore());
      online.set(false);
      answer = 'unreachable';
      again.open();
      expect(again.state()).toBe('ready');
      expect(again.offline()).toBe(true);
      expect(again.cards().map((card) => card.id)).toEqual(['lakeside', 'thursday']);
      expect(offlineShown).toEqual([]);
    });

    it('opens the offline screen when nothing was saved', () => {
      online.set(false);
      answer = 'unreachable';
      store.open();
      expect(offlineShown).toEqual(['/popkins']);
    });

    it('never shows another person’s saved list', () => {
      saved.set('walt', both);
      online.set(false);
      answer = 'unreachable';
      store.open();
      expect(store.cards()).toEqual([]);
      expect(offlineShown).toEqual(['/popkins']);
    });

    it('says it is offline over a list already shown when the connection drops', () => {
      store.open();
      expect(store.offline()).toBe(false);
      online.set(false);
      expect(store.offline()).toBe(true);
    });

    it('reads again when the connection returns', () => {
      online.set(false);
      saved.set('mara', { active: [thursday], wrappedUp: [] });
      answer = 'unreachable';
      store.open();
      answer = both;
      online.set(true);
      backOnline.next();
      expect(store.offline()).toBe(false);
      expect(store.cards()).toHaveLength(2);
    });
  });
});
