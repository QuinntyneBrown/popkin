import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConversationsView, DirectSummaryView, MessageView } from '../../models/chat';
import { POPKIN_REALTIME } from '../realtime/popkin-realtime';
import { CHAT_API } from './chat-api';
import { ConversationsStore } from './conversations-store';
import { UnreadTracker } from './unread-tracker';

const avatar = (initials: string) => ({ initials, accent: 'Sky', photoUrl: null }) as const;
const at = (day: number, hour: number, minute: number) =>
  new Date(2026, 8, day, hour, minute).toISOString();

const walt: DirectSummaryView = {
  threadId: 't-walt',
  other: {
    membershipId: 'm-walt',
    displayName: 'Walt Brennan',
    firstName: 'Walt',
    avatar: avatar('WB'),
  },
  latest: { text: 'Ha, I’ll save you the corner piece.', isMine: false, sentAt: at(12, 9, 41) },
  unreadCount: 1,
};
const ellie: DirectSummaryView = {
  threadId: 't-ellie',
  other: {
    membershipId: 'm-ellie',
    displayName: 'Ellie Brennan',
    firstName: 'Ellie',
    avatar: avatar('EB'),
  },
  latest: { text: 'thanks for the paddles!', isMine: true, sentAt: at(12, 8, 5) },
  unreadCount: 0,
};
const dev: DirectSummaryView = {
  threadId: 't-dev',
  other: {
    membershipId: 'm-dev',
    displayName: 'Dev Patel',
    firstName: 'Dev',
    avatar: avatar('DP'),
  },
  latest: { text: 'Did you get the photo of the heron?', isMine: false, sentAt: at(11, 18, 0) },
  unreadCount: 0,
};
const list: ConversationsView = {
  viewerMembershipId: 'm-mara',
  everyone: {
    threadId: 't-everyone',
    latest: {
      firstName: 'Mara',
      text: 'last call for the canoe sign-up 🛶',
      isMine: true,
      sentAt: at(12, 9, 24),
    },
    unreadCount: 3,
  },
  direct: [walt, ellie, dev],
};

const from = (threadId: string, membershipId: string, firstName: string, text: string) =>
  ({
    id: `${threadId}-${text}`,
    popkinId: 'p',
    threadId,
    clientMessageId: null,
    kind: 'Member',
    author: { membershipId, firstName, avatar: avatar('XX') },
    text,
    sentAt: at(12, 12, 1),
  }) as MessageView;

describe('ConversationsStore (L2-022)', () => {
  let answer: ConversationsView | 'down' | 'not-found';
  let asked: number;
  let messages: Subject<MessageView>;
  let deleted: Subject<{ threadId: string; messageId: string }>;
  let read: Subject<string>;
  let reconnected: Subject<void>;
  let store: ConversationsStore;

  const listThreads = (): Observable<ConversationsView> => {
    asked++;
    if (answer === 'down') return throwError(() => new HttpErrorResponse({ status: 500 }));
    if (answer === 'not-found') return throwError(() => new HttpErrorResponse({ status: 404 }));
    return of(answer);
  };

  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(2026, 8, 12, 12, 0) });
    answer = list;
    asked = 0;
    messages = new Subject();
    deleted = new Subject();
    read = new Subject();
    reconnected = new Subject();
    TestBed.configureTestingModule({
      providers: [
        ConversationsStore,
        { provide: CHAT_API, useValue: { listThreads } },
        {
          provide: POPKIN_REALTIME,
          useValue: {
            messageAdded$: messages,
            messageDeleted$: deleted,
            threadRead$: read,
            reconnected$: reconnected,
            start: vi.fn(),
          },
        },
      ],
    });
    store = TestBed.inject(ConversationsStore);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('is loading until the threads arrive', () => {
    expect(store.state()).toBe('loading');
    expect(store.everyone()).toBeNull();
  });

  it('puts Everyone first, with its latest message, time and unread count', () => {
    store.open('p');
    expect(store.state()).toBe('ready');
    expect(store.everyone()).toEqual({
      threadId: 't-everyone',
      latest: 'Mara: last call for the canoe sign-up 🛶',
      time: '9:24',
      unread: 3,
      unreadLabel: '3 unread messages',
    });
  });

  it('says so when nobody has written to everyone', () => {
    answer = { ...list, everyone: { threadId: 't-everyone', latest: null, unreadCount: 0 } };
    store.open('p');
    expect(store.everyone()).toMatchObject({
      latest: 'No messages yet',
      time: '',
      unread: 0,
      unreadLabel: null,
    });
  });

  it('lists the direct messages as the API ordered them, each with its words', () => {
    store.open('p');
    expect(store.rows()).toEqual([
      {
        threadId: 't-walt',
        memberId: 'm-walt',
        name: 'Walt Brennan',
        avatar: avatar('WB'),
        latest: 'Ha, I’ll save you the corner piece.',
        time: '9:41',
        unread: true,
      },
      {
        threadId: 't-ellie',
        memberId: 'm-ellie',
        name: 'Ellie Brennan',
        avatar: avatar('EB'),
        latest: 'You: thanks for the paddles!',
        time: '8:05',
        unread: false,
      },
      {
        threadId: 't-dev',
        memberId: 'm-dev',
        name: 'Dev Patel',
        avatar: avatar('DP'),
        latest: 'Did you get the photo of the heron?',
        time: 'Fri',
        unread: false,
      },
    ]);
  });

  it('has no rows for a member with no direct messages', () => {
    answer = { ...list, direct: [] };
    store.open('p');
    expect(store.state()).toBe('ready');
    expect(store.rows()).toEqual([]);
  });

  it('says so when the threads did not load, and reads again on retry', () => {
    answer = 'down';
    store.open('p');
    expect(store.state()).toBe('error');
    answer = list;
    store.retry();
    expect(store.state()).toBe('ready');
  });

  it('is not found for someone who is not a member', () => {
    answer = 'not-found';
    store.open('p');
    expect(store.state()).toBe('not-found');
  });

  it('gives the unread tracker every thread’s count', () => {
    store.open('p');
    const unread = TestBed.inject(UnreadTracker);
    expect(unread.forThread('t-walt')).toBe(1);
    expect(unread.forPopkin('p')).toBe(4);
  });

  describe('a message arriving', () => {
    beforeEach(() => store.open('p'));

    it('in a direct message moves it first, shows it and marks it unread', () => {
      messages.next(from('t-dev', 'm-dev', 'Dev', 'Found it!'));
      expect(store.rows().map((row) => row.threadId)).toEqual(['t-dev', 't-walt', 't-ellie']);
      expect(store.rows()[0]).toMatchObject({ latest: 'Found it!', time: '12:01', unread: true });
    });

    it('from the member, sent elsewhere, reads "You:" and stays read', () => {
      messages.next(from('t-dev', 'm-mara', 'Mara', 'Got it, thanks'));
      expect(store.rows()[0]).toMatchObject({
        threadId: 't-dev',
        latest: 'You: Got it, thanks',
        unread: false,
      });
    });

    it('to everyone changes the Everyone card and its count', () => {
      messages.next(from('t-everyone', 'm-walt', 'Walt', 'Kettle is on'));
      expect(store.everyone()).toMatchObject({
        latest: 'Walt: Kettle is on',
        time: '12:01',
        unread: 4,
        unreadLabel: '4 unread messages',
      });
    });

    it('that is a note of the system leaves the Everyone card as it was', () => {
      messages.next({ ...from('t-everyone', 'm-joel', 'Joel', 'popped in'), kind: 'System' });
      expect(store.everyone()?.latest).toBe('Mara: last call for the canoe sign-up 🛶');
    });

    it('in a direct message the list does not hold yet reads the list again', () => {
      messages.next(from('t-ruth', 'm-ruth', 'Ruth', 'See you at the dock 💛'));
      expect(asked).toBe(2);
    });

    it('in another Popkin is ignored', () => {
      messages.next({ ...from('t-other', 'm-walt', 'Walt', 'hello'), popkinId: 'q' });
      expect(asked).toBe(1);
      expect(store.rows()).toHaveLength(3);
    });
  });

  it('shows a thread as read once it is read, here or on another device', () => {
    store.open('p');
    read.next('t-walt');
    expect(store.rows()[0].unread).toBe(false);
  });

  it('reads again, keeping what it shows, when a message is deleted or the connection returns', () => {
    store.open('p');
    answer = 'down';
    deleted.next({ threadId: 't-walt', messageId: 'x' });
    reconnected.next();
    expect(asked).toBe(3);
    expect(store.state()).toBe('ready');
    expect(store.rows()).toHaveLength(3);
  });
});
