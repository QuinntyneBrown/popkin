import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MemberJoinedView,
  MessagePageView,
  MessageView,
  PresenceView,
  ReactionSummary,
  ThreadView,
} from '../../models/chat';
import { POPKIN_REALTIME } from '../realtime/popkin-realtime';
import { CHAT_API, ChatApi, MessagesCursor } from './chat-api';
import { OUTBOX_STORAGE } from './message-outbox';
import { NETWORK_STATUS } from './network-status';
import { POPKINS_API } from '../popkins/popkins-api';
import { WrapUpWatch } from '../wrap-up/wrap-up-watch';
import { ThreadStore } from './thread-store';
import { UnreadTracker } from './unread-tracker';

const me = 'm-mara';

function message(n: number, author = 'Walt', extra: Partial<MessageView> = {}): MessageView {
  return {
    id: `id-${String(n).padStart(4, '0')}`,
    popkinId: 'p',
    threadId: 't',
    clientMessageId: `c-${n}`,
    kind: 'Member',
    author: {
      membershipId: `m-${author.toLowerCase()}`,
      firstName: author,
      avatar: { initials: 'XX', accent: 'Teal', photoUrl: null },
    },
    text: `message ${n}`,
    sentAt: new Date(2026, 8, 12, 9, 0, n).toISOString(),
    reactions: [],
    quote: null,
    ...extra,
  };
}

const thread: ThreadView = {
  id: 't',
  popkinId: 'p',
  kind: 'Everyone',
  popkinName: 'Lakeside Weekend',
  emoji: '🏕️',
  colour: 'Teal',
  endsAt: null,
  memberCount: 14,
  hereNow: 5,
  presenceVersion: 7,
  readOnly: false,
  unreadCount: 3,
  lastReadMessageId: null,
  viewer: { membershipId: me, firstName: 'Mara' },
  other: null,
};

const withWalt: ThreadView = {
  ...thread,
  id: 't-walt',
  kind: 'Direct',
  memberCount: 2,
  unreadCount: 1,
  other: {
    membershipId: 'm-walt',
    displayName: 'Walt Brennan',
    firstName: 'Walt',
    avatar: { initials: 'WB', accent: 'Sky', photoUrl: null },
  },
};

class FakeChat implements ChatApi {
  thread: ThreadView | null = thread;
  /** Everything the server holds for the thread, oldest first. */
  stored: MessageView[] = [];
  presence: PresenceView = { version: 7, hereNow: 5, members: [] };
  readonly asked: MessagesCursor[] = [];
  readonly read: string[] = [];
  readonly sends: string[] = [];
  failMessages = false;
  notFound = false;
  /** The members a direct message was asked for with. */
  readonly direct: string[] = [];
  presenceAsked = 0;
  selfRefused = false;

  getEveryone(): Observable<ThreadView> {
    if (this.thread) return of(this.thread);
    return throwError(() =>
      this.notFound ? new HttpErrorResponse({ status: 404 }) : new Error('down'),
    );
  }

  listThreads(): Observable<never> {
    return throwError(() => new Error('not asked here'));
  }

  openDirect(_p: string, memberId: string): Observable<ThreadView> {
    this.direct.push(memberId);
    if (this.selfRefused) {
      return throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { status: 400, code: 'cannot_message_self' },
          }),
      );
    }
    if (this.notFound) return throwError(() => new HttpErrorResponse({ status: 404 }));
    return of(withWalt);
  }

  getEveryonePreview(): Observable<never> {
    return throwError(() => new Error('not asked here'));
  }

  getMessages(_p: string, _t: string, cursor?: MessagesCursor): Observable<MessagePageView> {
    this.asked.push(cursor);
    if (this.failMessages) return throwError(() => new Error('down'));
    const all = this.stored;
    const at = (id: string) => all.findIndex((m) => m.id === id);
    if (!cursor) return of({ items: all.slice(-50), hasMore: all.length > 50 });
    if ('before' in cursor) {
      const end = at(cursor.before);
      return of({ items: all.slice(Math.max(0, end - 50), end), hasMore: end > 50 });
    }
    if ('after' in cursor) {
      const start = at(cursor.after) + 1;
      return of({ items: all.slice(start, start + 50), hasMore: all.length > start + 50 });
    }
    return of({ items: all.slice(at(cursor.from), at(cursor.to) + 1), hasMore: false });
  }

  send(_p: string, _t: string, clientMessageId: string, text: string): Observable<MessageView> {
    this.sends.push(text);
    return of(message(900 + this.sends.length, 'Mara', { clientMessageId, text }));
  }

  discard(): Observable<void> {
    return of(undefined);
  }

  /** Each reaction asked for, as "+🥞 id-0001" or "-🥞 id-0001". */
  readonly reacted: string[] = [];
  /** The answer to the next reaction; by default what the server would hold. */
  reactionAnswer: 'held' | 'fail' | Subject<ReactionSummary[]> = 'held';

  react(_p: string, _t: string, messageId: string, emoji: string): Observable<ReactionSummary[]> {
    return this.reaction('+', messageId, emoji);
  }

  unreact(_p: string, _t: string, messageId: string, emoji: string): Observable<ReactionSummary[]> {
    return this.reaction('-', messageId, emoji);
  }

  private reaction(
    how: '+' | '-',
    messageId: string,
    emoji: string,
  ): Observable<ReactionSummary[]> {
    this.reacted.push(`${how}${emoji} ${messageId}`);
    const answer = this.reactionAnswer;
    if (answer === 'fail') return throwError(() => new Error('down'));
    if (answer !== 'held') return answer;
    const stored = this.stored.find((m) => m.id === messageId);
    if (!stored) return of([]);
    const others = stored.reactions.find((r) => r.emoji === emoji)?.membershipIds ?? [];
    const ids = how === '+' ? [...new Set([...others, me])] : others.filter((id) => id !== me);
    const rest = stored.reactions.filter((r) => r.emoji !== emoji);
    stored.reactions = ids.length ? [...rest, { emoji, membershipIds: ids }] : rest;
    return of(stored.reactions);
  }

  readonly deleted: string[] = [];
  deleteFails = false;

  deleteMessage(_p: string, _t: string, messageId: string): Observable<void> {
    this.deleted.push(messageId);
    if (this.deleteFails) return throwError(() => new Error('down'));
    this.stored = this.stored.filter((m) => m.id !== messageId);
    return of(undefined);
  }

  markRead(_p: string, _t: string, lastReadMessageId: string): Observable<void> {
    this.read.push(lastReadMessageId);
    return of(undefined);
  }

  getPresence(): Observable<PresenceView> {
    this.presenceAsked++;
    return of(this.presence);
  }
}

describe('ThreadStore', () => {
  let chat: FakeChat;
  let store: ThreadStore;
  let unread: UnreadTracker;
  const realtime = {
    state: signal('connected'),
    messageAdded$: new Subject<MessageView>(),
    messageDeleted$: new Subject<{ threadId: string; messageId: string }>(),
    reactionsChanged$: new Subject<{
      threadId: string;
      messageId: string;
      reactions: ReactionSummary[];
    }>(),
    threadRead$: new Subject<string>(),
    presenceChanged$: new Subject<{ popkinId: string; version: number; hereNow: number }>(),
    memberJoined$: new Subject<{ popkinId: string; member: MemberJoinedView }>(),
    memberLeft$: new Subject<{ popkinId: string; membershipId: string }>(),
    reconnected$: new Subject<void>(),
    popkinWrappedUp$: new Subject<string>(),
    started: 0,
    start() {
      this.started++;
    },
    stop: () => undefined,
  };

  const shown = () => store.rows().flatMap((row) => (row.kind === 'message' ? [row.text] : []));
  const range = (from: number, to: number) =>
    Array.from({ length: to - from + 1 }, (_, i) => message(from + i));

  beforeEach(() => {
    chat = new FakeChat();
    chat.stored = range(1, 3);
    TestBed.configureTestingModule({
      providers: [
        ThreadStore,
        { provide: CHAT_API, useValue: chat },
        { provide: POPKIN_REALTIME, useValue: realtime },
        { provide: POPKINS_API, useValue: {} },
        { provide: NETWORK_STATUS, useValue: { online: signal(true), backOnline$: new Subject() } },
        { provide: OUTBOX_STORAGE, useValue: { load: () => [], save: () => undefined } },
      ],
    });
    store = TestBed.inject(ThreadStore);
    unread = TestBed.inject(UnreadTracker);
  });

  describe('opening', () => {
    it('is loading until the thread and its latest messages are read', () => {
      expect(store.state()).toBe('loading');
      store.open('p');
      expect(store.state()).toBe('ready');
      expect(store.thread()?.popkinName).toBe('Lakeside Weekend');
      expect(shown()).toEqual(['message 1', 'message 2', 'message 3']);
      expect(realtime.started).toBeGreaterThan(0);
    });

    it('has the watch look at the Popkin until it has wrapped up (L2-044 AC4)', () => {
      const look = vi.spyOn(TestBed.inject(WrapUpWatch), 'look');
      const endsAt = new Date(2026, 8, 13, 18, 0).toISOString();
      chat.thread = { ...thread, endsAt };
      store.open('p');
      expect(look).toHaveBeenLastCalledWith('p', endsAt);
      chat.thread = { ...thread, endsAt, readOnly: true };
      store.open('p');
      expect(look).toHaveBeenLastCalledWith(null, null);
    });

    it('is empty when the Popkin has no messages (L2-021 AC8)', () => {
      chat.stored = [];
      store.open('p');
      expect(store.state()).toBe('empty');
    });

    it.each(['thread', 'messages'])('is an error when the %s cannot be read', (what) => {
      if (what === 'thread') chat.thread = null;
      else chat.failMessages = true;
      store.open('p');
      expect(store.state()).toBe('error');
    });

    it('is not found for someone who is not a member (L2-051)', () => {
      chat.thread = null;
      chat.notFound = true;
      store.open('p');
      expect(store.state()).toBe('not-found');
    });

    it('opens again after an error', () => {
      chat.failMessages = true;
      store.open('p');
      chat.failMessages = false;
      store.open('p');
      expect(store.state()).toBe('ready');
    });

    it('tells the unread count the API gave, while the latest is not in view', () => {
      store.setLatestInView(false);
      store.open('p');
      expect(unread.forThread('t')).toBe(3);
    });
  });

  describe('live messages (L2-027)', () => {
    beforeEach(() => store.open('p'));

    it('adds a message as it arrives and says a message was added', () => {
      const added: string[] = [];
      store.added$.subscribe((whose) => added.push(whose));

      realtime.messageAdded$.next(message(4));

      expect(shown().at(-1)).toBe('message 4');
      expect(added).toEqual(['theirs']);
    });

    it('ignores another thread’s message', () => {
      realtime.messageAdded$.next(message(4, 'Walt', { threadId: 'other' }));
      expect(shown()).toHaveLength(3);
    });

    it('drops an event for a message it already shows', () => {
      realtime.messageAdded$.next(message(3));
      expect(shown()).toHaveLength(3);
    });

    it('announces a message from someone else with its sender, and not the member’s own', () => {
      realtime.messageAdded$.next(message(4, 'Walt'));
      expect(store.announcement()).toBe('Walt: message 4');

      realtime.messageAdded$.next(message(5, 'Mara'));
      expect(store.announcement()).toBe('Walt: message 4');
    });

    it('raises "New messages" when one arrives while older messages are being read', () => {
      store.setLatestInView(false);
      realtime.messageAdded$.next(message(4));
      expect(store.newMessagesBelow()).toBe(true);

      store.setLatestInView(true);
      expect(store.newMessagesBelow()).toBe(false);
    });

    it('does not raise "New messages" with the latest in view', () => {
      realtime.messageAdded$.next(message(4));
      expect(store.newMessagesBelow()).toBe(false);
    });

    it('removes a message that was deleted', () => {
      realtime.messageDeleted$.next({ threadId: 't', messageId: message(2).id });
      expect(shown()).toEqual(['message 1', 'message 3']);
    });

    it('counts a member who joins', () => {
      realtime.memberJoined$.next({ popkinId: 'p', member: {} as MemberJoinedView });
      realtime.memberJoined$.next({ popkinId: 'elsewhere', member: {} as MemberJoinedView });
      expect(store.thread()?.memberCount).toBe(15);
    });

    it('counts one member fewer when someone leaves (L2-047 AC2)', () => {
      realtime.memberLeft$.next({ popkinId: 'p', membershipId: 'm-joel' });
      realtime.memberLeft$.next({ popkinId: 'elsewhere', membershipId: 'm-joel' });
      expect(store.thread()?.memberCount).toBe(13);
    });
  });

  describe('reading (L2-027 AC4)', () => {
    it('moves the read point to the latest message once it is in view, and zeroes the count', () => {
      store.open('p');
      expect(chat.read).toEqual([message(3).id]);
      expect(unread.forThread('t')).toBe(0);
    });

    it('does not move the read point while older messages are being read', () => {
      store.setLatestInView(false);
      store.open('p');
      realtime.messageAdded$.next(message(4));
      expect(chat.read).toEqual([]);
      expect(unread.forThread('t')).toBe(4);

      store.setLatestInView(true);
      expect(chat.read).toEqual([message(4).id]);
      expect(unread.forThread('t')).toBe(0);
    });

    it('does not report the same message twice', () => {
      store.open('p');
      store.setLatestInView(false);
      store.setLatestInView(true);
      expect(chat.read).toHaveLength(1);
    });
  });

  describe('paging (L2-027 AC5)', () => {
    beforeEach(() => {
      chat.stored = range(1, 120);
      store.open('p');
    });

    it('opens on the latest 50 and knows there are earlier ones', () => {
      expect(shown()).toHaveLength(50);
      expect(shown()[0]).toBe('message 71');
      expect(store.hasEarlier()).toBe(true);
    });

    it('loads the page before the oldest shown, until there are none', async () => {
      await store.loadEarlier();
      expect(shown()).toHaveLength(100);
      expect(shown()[0]).toBe('message 21');
      expect(chat.asked.at(-1)).toEqual({ before: message(71).id });

      await store.loadEarlier();
      expect(shown()).toHaveLength(120);
      expect(store.hasEarlier()).toBe(false);

      await store.loadEarlier();
      expect(chat.asked).toHaveLength(3);
    });
  });

  describe('catching up after a reconnect', () => {
    beforeEach(() => store.open('p'));

    it('reads what was missed, page after page', () => {
      chat.stored = range(1, 130);
      realtime.reconnected$.next();
      expect(shown()).toHaveLength(130);
      expect(shown().at(-1)).toBe('message 130');
    });

    it('replaces what it shows with the server’s, so a message deleted meanwhile goes', () => {
      chat.stored = [message(1), message(3), message(4)];
      realtime.reconnected$.next();
      expect(shown()).toEqual(['message 1', 'message 3', 'message 4']);
    });

    it('keeps a message that arrives while the window is being read', () => {
      const read = chat.getMessages.bind(chat);
      chat.getMessages = (p, t, cursor) => {
        const answer = read(p, t, cursor);
        // The window was read on the server before this message was stored.
        if (cursor && 'from' in cursor) realtime.messageAdded$.next(message(9));
        return answer;
      };
      realtime.reconnected$.next();
      expect(shown()).toEqual(['message 1', 'message 2', 'message 3', 'message 9']);
    });

    it('raises "New messages" for what was missed while older messages were being read', () => {
      store.setLatestInView(false);
      chat.stored = range(1, 5);
      realtime.reconnected$.next();
      expect(store.newMessagesBelow()).toBe(true);
    });
  });

  describe('presence', () => {
    beforeEach(() => store.open('p'));

    it('takes a newer count and reads who is here', () => {
      chat.presence = {
        version: 8,
        hereNow: 6,
        members: [
          { membershipId: 'm-walt', displayName: 'Walt Brennan', avatar: message(1).author.avatar },
        ],
      };
      realtime.presenceChanged$.next({ popkinId: 'p', version: 8, hereNow: 6 });
      expect(store.thread()?.hereNow).toBe(6);
      expect(store.hereNow().map((member) => member.displayName)).toEqual(['Walt Brennan']);
    });

    it('ignores a count older than the one it shows, and another Popkin’s', () => {
      realtime.presenceChanged$.next({ popkinId: 'p', version: 6, hereNow: 1 });
      realtime.presenceChanged$.next({ popkinId: 'elsewhere', version: 99, hereNow: 1 });
      expect(store.thread()?.hereNow).toBe(5);
    });
  });

  describe('sending (L2-021 AC5)', () => {
    beforeEach(() => store.open('p'));

    it('shows the message at once, as the member’s own, and once only after its echo', () => {
      const added: string[] = [];
      store.added$.subscribe((whose) => added.push(whose));

      store.send('  On it!  ');

      expect(chat.sends).toEqual(['On it!']);
      expect(shown().filter((text) => text === 'On it!')).toHaveLength(1);
      expect(added).toContain('mine');

      const stored = store.rows().at(-1);
      realtime.messageAdded$.next(
        message(901, 'Mara', {
          text: 'On it!',
          clientMessageId: stored?.kind === 'message' ? stored.clientMessageId : '',
        }),
      );
      expect(shown().filter((text) => text === 'On it!')).toHaveLength(1);
    });

    it('sends nothing for white space', () => {
      store.send('   ');
      expect(chat.sends).toEqual([]);
    });
  });

  describe('opened out of view', () => {
    it('is not read until its latest message comes into view', () => {
      store.open('p', undefined, { inView: false });
      expect(chat.read).toEqual([]);
      expect(unread.forThread('t')).toBe(3);

      store.setLatestInView(true);
      expect(chat.read).toEqual(['id-0003']);
      expect(unread.forThread('t')).toBe(0);
    });
  });

  describe('a direct message', () => {
    it('opens the thread with the member, and reads its messages', () => {
      chat.stored = [message(1, 'Walt', { threadId: 't-walt' })];
      store.open('p', 'm-walt');
      expect(chat.direct).toEqual(['m-walt']);
      expect(store.thread()).toMatchObject({ id: 't-walt', kind: 'Direct' });
      expect(store.state()).toBe('ready');
      expect(shown()).toEqual(['message 1']);
    });

    it('does not ask who is here', () => {
      store.open('p', 'm-walt');
      expect(chat.presenceAsked).toBe(0);
    });

    it('is not found with the member themself', () => {
      chat.selfRefused = true;
      store.open('p', me);
      expect(store.state()).toBe('not-found');
    });

    it('is not found for a member the Popkin does not have', () => {
      chat.notFound = true;
      store.open('p', 'm-nobody');
      expect(store.state()).toBe('not-found');
    });

    it('shows a message that arrives in it, and not one of another thread', () => {
      chat.stored = [];
      store.open('p', 'm-walt');
      realtime.messageAdded$.next(message(7, 'Walt', { threadId: 't-walt' }));
      realtime.messageAdded$.next(message(8, 'Dev'));
      expect(shown()).toEqual(['message 7']);
    });
  });

  describe('reactions (L2-024)', () => {
    const chips = (n = 1) => {
      const row = store.rows().find((r) => r.kind === 'message' && r.id === `id-000${n}`);
      return row?.kind === 'message'
        ? row.reactions.map((c) => `${c.emoji}${c.count}${c.mine ? '*' : ''}`)
        : [];
    };

    beforeEach(() => {
      chat.stored = [
        message(1, 'Walt', { reactions: [{ emoji: '🥞', membershipIds: ['m-walt'] }] }),
      ];
      store.open('p');
    });

    it('shows the member’s reaction at once, pressed, and keeps what the server answers (AC2)', () => {
      const answer = new Subject<ReactionSummary[]>();
      chat.reactionAnswer = answer;
      store.toggleReaction('id-0001', '❤️');
      expect(chips()).toEqual(['🥞1', '❤️1*']);
      expect(chat.reacted).toEqual(['+❤️ id-0001']);

      answer.next([
        { emoji: '🥞', membershipIds: ['m-walt'] },
        { emoji: '❤️', membershipIds: ['m-dev', me] },
      ]);
      expect(chips()).toEqual(['🥞1', '❤️2*']);
    });

    it('adds the member to a chip someone else chose', () => {
      store.toggleReaction('id-0001', '🥞');
      expect(chips()).toEqual(['🥞2*']);
    });

    it('takes the member’s reaction away when they choose it again, and the chip at zero (AC3)', () => {
      store.toggleReaction('id-0001', '❤️');
      store.toggleReaction('id-0001', '❤️');
      expect(chat.reacted).toEqual(['+❤️ id-0001', '-❤️ id-0001']);
      expect(chips()).toEqual(['🥞1']);
    });

    it('shows both of a member’s different emoji (AC4)', () => {
      store.toggleReaction('id-0001', '❤️');
      store.toggleReaction('id-0001', '🔥');
      expect(chips()).toEqual(['🥞1', '❤️1*', '🔥1*']);
    });

    it('puts the chips back and says so when the reaction does not save, with a way to try again', () => {
      const failures: string[] = [];
      store.failures$.subscribe((failure) => {
        failures.push(failure.kind);
        chat.reactionAnswer = 'held';
        failure.retry();
      });
      chat.reactionAnswer = 'fail';
      store.toggleReaction('id-0001', '❤️');
      expect(failures).toEqual(['reaction']);
      expect(chips()).toEqual(['🥞1', '❤️1*']);
      expect(chat.reacted).toEqual(['+❤️ id-0001', '+❤️ id-0001']);
    });

    it('puts back exactly what was there before a failure', () => {
      chat.reactionAnswer = 'fail';
      store.failures$.subscribe(() => undefined);
      store.toggleReaction('id-0001', '🥞');
      expect(chips()).toEqual(['🥞1']);
    });

    it('shows what others choose as it happens, and nothing of another thread', () => {
      realtime.reactionsChanged$.next({
        threadId: 't',
        messageId: 'id-0001',
        reactions: [{ emoji: '😂', membershipIds: ['m-dev', 'm-ruth'] }],
      });
      realtime.reactionsChanged$.next({
        threadId: 't-other',
        messageId: 'id-0001',
        reactions: [],
      });
      expect(chips()).toEqual(['😂2']);
    });

    it('does nothing in a Popkin that has wrapped up', () => {
      chat.thread = { ...thread, readOnly: true };
      store.open('p');
      store.toggleReaction('id-0001', '❤️');
      expect(chat.reacted).toEqual([]);
      expect(chips()).toEqual(['🥞1']);
    });
  });
});
