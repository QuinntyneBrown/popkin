import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemberJoinedView, MessageView } from '../../models/chat';
import {
  ChatPreviewView,
  ExperiencesSummaryView,
  MemberView,
  PhotosSummaryView,
  PopkinHomeView,
} from '../../models/home';
import { PopkinSettingsView } from '../../models/popkin';
import { CHAT_API } from '../chat/chat-api';
import { EXPERIENCES_API } from '../experiences/experiences-api';
import { PHOTOS_API } from '../photos/photos-api';
import { POPKIN_REALTIME } from '../realtime/popkin-realtime';
import { UnreadTracker } from '../chat/unread-tracker';
import { PopkinHomeStore } from './popkin-home-store';
import { POPKINS_API } from './popkins-api';

const avatar = { initials: 'MO', accent: 'Coral', photoUrl: null } as const;
const home: PopkinHomeView = {
  id: 'p',
  name: 'Lakeside Weekend',
  emoji: '🏕️',
  colour: 'Teal',
  status: 'Active',
  wrappedUpAt: null,
  keepPhotos: true,
  photosRemoveAt: null,
  photosRemovedAt: null,
  length: 'TheWeekend',
  endsAt: new Date(2026, 8, 13, 18, 0).toISOString(),
  memberCount: 14,
  avatars: [avatar],
  viewerRole: 'Host',
  viewer: { membershipId: 'm-mara', firstName: 'Mara' },
  unreadCount: 3,
  version: 1,
};
const mara: MemberView = {
  membershipId: 'm-mara',
  displayName: 'Mara Okafor',
  avatar,
  role: 'Host',
  isViewer: true,
};
const line = (id: string, firstName: string) => ({
  id,
  author: { membershipId: `m-${firstName.toLowerCase()}`, firstName, avatar },
  text: `from ${firstName}`,
  sentAt: new Date(2026, 8, 12, 9, 12).toISOString(),
});

/** Answers each read from what it holds, and counts how often each was asked. */
class Fake {
  home: PopkinHomeView | 'missing' | 'down' = home;
  preview: ChatPreviewView | 'down' = { threadId: 't', messages: [line('1', 'Walt')], newCount: 3 };
  photos: PhotosSummaryView | 'missing' | 'down' = {
    count: 48,
    photos: [{ id: 'ph', thumbnailUrl: '/t.jpg', caption: 'First light' }],
  };
  experiences: ExperiencesSummaryView | 'down' = {
    count: 4,
    top: [{ id: 'e', name: 'Sunrise canoe', photoUrl: null, average: 4.8, ratingCount: 11 }],
  };
  members: MemberView[] | 'down' = [mara];
  readonly asked = { home: 0, preview: 0, photos: 0, experiences: 0, members: 0 };

  private answer<T>(key: keyof Fake['asked'], value: T | 'missing' | 'down'): Observable<T> {
    this.asked[key]++;
    if (value === 'missing') return throwError(() => new HttpErrorResponse({ status: 404 }));
    if (value === 'down') return throwError(() => new HttpErrorResponse({ status: 500 }));
    return of(value);
  }

  getHome = () => this.answer('home', this.home);
  getMembers = () => this.answer('members', this.members);
  getEveryonePreview = () => this.answer('preview', this.preview);
  /** Two unread in Walt's direct message, beside the three of Everyone. */
  listThreads = () =>
    of({
      viewerMembershipId: 'm-mara',
      everyone: { threadId: 't', latest: null, unreadCount: 3 },
      direct: [
        {
          threadId: 't-walt',
          other: {} as never,
          latest: { text: 'hi', isMine: false, sentAt: '2026-09-12T09:00:00Z' },
          unreadCount: 2,
        },
      ],
    });
  getSummary = () => this.answer('photos', this.photos);
}

describe('PopkinHomeStore', () => {
  let api: Fake;
  let store: PopkinHomeStore;
  const realtime = {
    state: signal('connected'),
    messageAdded$: new Subject<MessageView>(),
    messageDeleted$: new Subject<{ threadId: string; messageId: string }>(),
    threadRead$: new Subject<string>(),
    presenceChanged$: new Subject<{ popkinId: string; version: number; hereNow: number }>(),
    memberJoined$: new Subject<{ popkinId: string; member: MemberJoinedView }>(),
    memberLeft$: new Subject<{ popkinId: string; membershipId: string }>(),
    photosAdded$: new Subject<{ popkinId: string; photoIds: string[] }>(),
    reconnected$: new Subject<void>(),
    popkinWrappedUp$: new Subject<string>(),
    popkinChanged$: new Subject<PopkinSettingsView>(),
    started: 0,
    start() {
      this.started++;
    },
    stop: () => undefined,
  };
  const added = (threadId: string, author = 'm-walt'): MessageView =>
    ({ id: 'new', threadId, author: { membershipId: author } }) as MessageView;

  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(2026, 8, 12, 12, 0) });
    api = new Fake();
    realtime.started = 0;
    TestBed.configureTestingModule({
      providers: [
        PopkinHomeStore,
        { provide: POPKINS_API, useValue: api },
        { provide: CHAT_API, useValue: api },
        { provide: PHOTOS_API, useValue: api },
        {
          provide: EXPERIENCES_API,
          useValue: { getSummary: () => api['answer']('experiences', api.experiences) },
        },
        { provide: POPKIN_REALTIME, useValue: realtime },
      ],
    });
    store = TestBed.inject(PopkinHomeStore);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  describe('opening', () => {
    it('is loading until the Popkin answers', () => {
      expect(store.state()).toBe('loading');
      expect(store.chat().state).toBe('loading');
    });

    it('shows the header and every section', () => {
      store.open('p');
      expect(store.state()).toBe('ready');
      expect(store.popkin()?.name).toBe('Lakeside Weekend');
      expect(store.chat()).toMatchObject({ state: 'ready', data: { threadId: 't' } });
      expect(store.photos()).toMatchObject({ state: 'ready', data: { count: 48 } });
      expect(store.experiences()).toMatchObject({ state: 'ready', data: { count: 4 } });
      expect(store.members()).toMatchObject({ state: 'ready', data: [mara] });
    });

    it('opens the connection, so the home hears what happens', () => {
      store.open('p');
      expect(realtime.started).toBe(1);
    });

    it('is wrapped up for a Popkin that has ended: its recap is the place to be', () => {
      api.home = { ...(api.home as PopkinHomeView), status: 'WrappedUp' };
      store.open('p');
      expect(store.state()).toBe('wrapped-up');
    });

    it('warns in the last hour, until dismissed', () => {
      const home = api.home as PopkinHomeView;
      vi.setSystemTime(new Date(new Date(home.endsAt as string).getTime() - 42 * 60_000));
      store.open('p');
      expect(store.warning()?.lead).toBe('42 min left.');
      store.dismissWarning();
      expect(store.warning()).toBeNull();
    });

    it('is not found for someone who is not a member', () => {
      api.home = 'missing';
      store.open('p');
      expect(store.state()).toBe('not-found');
    });

    it('fails as a whole when the Popkin itself cannot be read', () => {
      api.home = 'down';
      store.open('p');
      expect(store.state()).toBe('error');
    });

    it('reads everything again on Try again', () => {
      api.home = 'down';
      store.open('p');
      api.home = home;
      store.retry();
      expect(store.state()).toBe('ready');
      expect(store.members().state).toBe('ready');
    });
  });

  // L2-019 AC8
  describe('a Popkin with nothing in it yet', () => {
    it('has an empty chat when nobody has written', () => {
      api.preview = { threadId: 't', messages: [], newCount: 0 };
      store.open('p');
      expect(store.chat().state).toBe('empty');
    });

    it('has empty photos and experiences', () => {
      api.photos = { count: 0, photos: [] };
      api.experiences = { count: 0, top: [] };
      store.open('p');
      expect(store.photos().state).toBe('empty');
      expect(store.experiences().state).toBe('empty');
    });
  });

  // L2-019 AC9
  describe('a section that fails', () => {
    beforeEach(() => {
      api.photos = 'down';
      store.open('p');
    });

    it('says so while the others still show', () => {
      expect(store.state()).toBe('ready');
      expect(store.photos().state).toBe('error');
      expect(store.chat().state).toBe('ready');
      expect(store.experiences().state).toBe('ready');
      expect(store.members().state).toBe('ready');
    });

    it('reads only that section again on Try again', () => {
      api.photos = { count: 1, photos: [] };
      store.retrySection('photos');
      expect(store.photos().state).toBe('ready');
      expect(api.asked).toMatchObject({
        home: 1,
        preview: 1,
        photos: 2,
        experiences: 1,
        members: 1,
      });
    });

    it('is not found as a whole if the section says the member is no longer one', () => {
      api.photos = 'missing';
      store.retrySection('photos');
      expect(store.state()).toBe('not-found');
    });
  });

  // L2-044 AC5
  describe('the time left', () => {
    it('reads in its two largest units with when it wraps up', () => {
      store.open('p');
      expect(store.timeLeftLine()).toBe('1 day 6 hrs left · Wraps up Sun, 6 pm');
      expect(store.timeLeft()).toBe('1 day 6 hrs left');
    });

    it('moves on each minute', () => {
      store.open('p');
      vi.advanceTimersByTime(60_000);
      expect(store.timeLeft()).toBe('1 day 5 hrs left');
    });

    it('is nothing for a Popkin that keeps going', () => {
      api.home = { ...home, endsAt: null };
      store.open('p');
      expect(store.timeLeftLine()).toBeNull();
    });
  });

  // L2-027 AC3
  describe('the count of new messages', () => {
    beforeEach(() => store.open('p'));

    it('starts from what the API answered', () => {
      expect(store.newCount()).toBe(3);
    });

    it('rises when someone else writes, and the latest messages are read again', () => {
      api.preview = { threadId: 't', messages: [line('2', 'Ellie')], newCount: 4 };
      realtime.messageAdded$.next(added('t'));
      expect(store.newCount()).toBe(4);
      expect(store.chat().data?.messages[0].id).toBe('2');
    });

    it('leaves the chat alone for a message of another thread', () => {
      realtime.messageAdded$.next(added('elsewhere'));
      expect(api.asked.preview).toBe(1);
    });

    it('counts the member’s direct messages on the Chat tab, not on the Chat card', () => {
      const unread = TestBed.inject(UnreadTracker);
      expect(unread.forPopkin('p')).toBe(5);
      expect(store.newCount()).toBe(3);

      realtime.threadRead$.next('t-walt');
      expect(unread.forPopkin('p')).toBe(3);
    });

    it('is zero once the thread is read, here or on another device', () => {
      realtime.threadRead$.next('t');
      expect(store.newCount()).toBe(0);
    });

    it('shows the first message of an empty chat when it arrives', () => {
      api.preview = { threadId: 't', messages: [], newCount: 0 };
      store.retrySection('chat');
      api.preview = { threadId: 't', messages: [line('1', 'Walt')], newCount: 1 };
      realtime.messageAdded$.next(added('t'));
      expect(store.chat().state).toBe('ready');
    });
  });

  describe('someone joining', () => {
    beforeEach(() => store.open('p'));

    it('reads the header and the members again', () => {
      api.home = { ...home, memberCount: 15 };
      realtime.memberJoined$.next({ popkinId: 'p', member: {} as MemberJoinedView });
      expect(store.popkin()?.memberCount).toBe(15);
      expect(api.asked).toMatchObject({ home: 2, members: 2, photos: 1 });
    });

    it('is ignored for another Popkin', () => {
      realtime.memberJoined$.next({ popkinId: 'other', member: {} as MemberJoinedView });
      expect(api.asked.home).toBe(1);
    });
  });

  describe('someone leaving (L2-047 AC2)', () => {
    beforeEach(() => store.open('p'));

    it('reads the header and the members again', () => {
      api.home = { ...home, memberCount: 13 };
      realtime.memberLeft$.next({ popkinId: 'p', membershipId: 'm-joel' });
      expect(store.popkin()?.memberCount).toBe(13);
      expect(api.asked).toMatchObject({ home: 2, members: 2, photos: 1 });
    });

    it('is ignored for another Popkin', () => {
      realtime.memberLeft$.next({ popkinId: 'other', membershipId: 'm-joel' });
      expect(api.asked.home).toBe(1);
    });
  });

  describe('after the connection comes back', () => {
    beforeEach(() => store.open('p'));

    it('reads everything again without going back to loading', () => {
      const states: string[] = [];
      api.home = { ...home, name: 'Lakeside' };
      const read = api.getMembers;
      api.getMembers = () => {
        states.push(store.members().state);
        return read();
      };
      realtime.reconnected$.next();
      expect(states).toEqual(['ready']);
      expect(store.popkin()?.name).toBe('Lakeside');
      expect(api.asked).toMatchObject({
        home: 2,
        preview: 2,
        photos: 2,
        experiences: 2,
        members: 2,
      });
    });

    it('keeps what it shows when the read fails', () => {
      api.members = 'down';
      api.home = 'down';
      realtime.reconnected$.next();
      expect(store.state()).toBe('ready');
      expect(store.members()).toMatchObject({ state: 'ready', data: [mara] });
    });
  });
  // L2-031 AC7
  describe('photos added while the home is open', () => {
    it('are read into the Photos section without a reload', () => {
      store.open('p');
      api.photos = { count: 49, photos: [{ id: 'new', thumbnailUrl: '/n.jpg', caption: null }] };
      realtime.photosAdded$.next({ popkinId: 'p', photoIds: ['new'] });
      expect(store.photos()).toMatchObject({ state: 'ready', data: { count: 49 } });
      expect(api.asked.photos).toBe(2);
    });

    it('are ignored when they are another Popkin’s', () => {
      store.open('p');
      realtime.photosAdded$.next({ popkinId: 'other', photoIds: ['x'] });
      expect(api.asked.photos).toBe(1);
    });
  });

  // L2-020 AC3, AC4: what the Host saves shows at once, for every member.
  it('applies the Host’s newer change of the Popkin, and drops an older one', () => {
    store.open('p');
    const change = (version: number): PopkinSettingsView => ({
      id: 'p',
      name: 'Campfire Nights',
      emoji: '🎉',
      colour: 'Plum',
      length: 'UntilDate',
      endsAt: new Date(2026, 8, 14, 18, 0).toISOString(),
      version,
    });
    realtime.popkinChanged$.next(change(1));
    expect(store.popkin()?.name).toBe('Lakeside Weekend');

    realtime.popkinChanged$.next(change(2));

    expect(store.popkin()?.name).toBe('Campfire Nights');
    expect(store.popkin()?.colour).toBe('Plum');
    expect(store.timeLeftLine()).toBe('2 days 6 hrs left · Wraps up Mon, 6 pm');
    expect(api.asked.home).toBe(1);
  });
});
