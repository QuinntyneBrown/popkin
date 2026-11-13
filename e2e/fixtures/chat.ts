import type { Page, Route } from '@playwright/test';
import path from 'node:path';
import responses from './api/responses.json';
import { hubOf, type Hub } from './hub';
import { mockToday } from './journeys';
import { GroupChatPage } from '../pages/group-chat.page';
import { problem, recordedBody } from './stubs';

/**
 * The Everyone thread of Lakeside Weekend as the mocks draw it, answered in place of the API
 * (ADR 0005): fourteen members, five here now, Mara looking. It keeps what a test sends, so a
 * sent message is answered as the API answers it and read back on a reload.
 */
const created = responses['POST /api/popkins'].body;
export const popkinId = created.id;
const recordedThread = recordedBody<RecordedThread>(
  `GET /api/popkins/${created.id}/threads/everyone`,
);
export const threadId = recordedThread.id;
export const chatUrl = `/p/${popkinId}/chat/everyone`;

/** The Everyone thread as the API answers it. */
interface RecordedThread {
  id: string;
  popkinId: string;
  kind: string;
  popkinName: string;
  emoji: string;
  colour: string;
  endsAt: string | null;
  memberCount: number;
  hereNow: number;
  presenceVersion: number;
  readOnly: boolean;
  unreadCount: number;
  lastReadMessageId: string | null;
  viewer: { membershipId: string; firstName: string };
}

interface Avatar {
  initials: string;
  accent: string;
  photoUrl: string | null;
}

export interface ChatMessage {
  id: string;
  popkinId: string;
  threadId: string;
  clientMessageId: string | null;
  kind: 'Member' | 'System';
  author: { membershipId: string; firstName: string; avatar: Avatar };
  text: string;
  sentAt: string;
}

const member = (name: string, initials: string, accent: string, photo?: string) => ({
  membershipId: `00000000-0000-4000-8000-${name.toLowerCase().padEnd(12, '0').slice(0, 12)}`,
  firstName: name,
  avatar: { initials, accent, photoUrl: photo ? `/photos/${photo}` : null },
});

export const people = {
  mara: member('Mara', 'MO', 'Coral', 'call1.jpg'),
  walt: member('Walt', 'WB', 'Leaf', 'call2.jpg'),
  dev: member('Dev', 'DP', 'Sky', 'call3.jpg'),
  ellie: member('Ellie', 'EB', 'Berry', 'call4.jpg'),
  ruth: member('Ruth', 'RL', 'Teal'),
  joel: member('Joel', 'J', 'Amber'),
};

const displayNames: Record<string, string> = {
  Walt: 'Walt Brennan',
  Ellie: 'Ellie Brennan',
  Dev: 'Dev Patel',
  Mara: 'Mara Okafor',
  Ruth: 'Ruth Lindqvist',
};

/** Saturday 12 September 2026 on the device: the day the thread of the mocks was written. */
export const saturday = (hour: number, minute = 0, second = 0): Date =>
  new Date(2026, 8, 12, hour, minute, second);

/** Monday morning: seen from here, the mocks' day reads "Saturday", as they draw it. */
export const theMondayAfter = new Date(2026, 8, 14, 8, 0);

let made = 0;

export function message(
  author: (typeof people)[keyof typeof people],
  text: string,
  sentAt: Date,
  extra: Partial<ChatMessage> = {},
): ChatMessage {
  made++;
  const id = `10000000-0000-4000-8000-${String(made).padStart(12, '0')}`;
  return {
    id,
    popkinId,
    threadId,
    clientMessageId: `20000000-0000-4000-8000-${String(made).padStart(12, '0')}`,
    kind: 'Member',
    author,
    text,
    sentAt: sentAt.toISOString(),
    ...extra,
  };
}

export const poppedIn = (who: typeof people.joel, at: Date): ChatMessage =>
  message(who, `${who.firstName} popped in. Say hi! 👋`, at, {
    kind: 'System',
    clientMessageId: null,
  });

/** The thread the mocks draw, in words only: reactions, replies and photos come later. */
export function theMockThread(): ChatMessage[] {
  return [
    poppedIn(people.joel, saturday(8, 2)),
    message(people.walt, 'Pancakes at the main cabin, 8:30. Bring an appetite.', saturday(8, 5)),
    message(people.dev, 'Dock was glass this morning', saturday(8, 40)),
    message(people.ellie, 'Can someone grab the paddles from the shed?', saturday(9, 20)),
    message(people.mara, 'On it! Also: last call for the canoe sign-up 🛶', saturday(9, 24)),
    message(people.ruth, 'Put me down for the 10 o’clock boat, please', saturday(9, 30)),
  ];
}

/** `count` messages, a minute apart, from Walt and Dev in runs of three. */
export function aLongThread(count: number): ChatMessage[] {
  return Array.from({ length: count }, (_, i) =>
    message(i % 6 < 3 ? people.walt : people.dev, `Message ${i + 1}`, saturday(6, i)),
  );
}

type Person = (typeof people)[keyof typeof people];

/** A member as a thread or the list of members names them. */
export interface Named {
  membershipId: string;
  displayName: string;
  avatar: Avatar;
}

const named = (person: Person): Named => ({
  membershipId: person.membershipId,
  displayName: displayNames[person.firstName] ?? person.firstName,
  avatar: person.avatar,
});

/** A direct message of Mara's (L2-023): the other member, and what the two wrote. */
export interface DirectThread {
  id: string;
  other: Named;
  messages: ChatMessage[];
  unreadCount: number;
}

export const directThreadId = (n: number): string =>
  `30000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

/** The address of the direct message with a member. */
export const directUrl = (person: { membershipId: string }): string =>
  `/p/${popkinId}/chat/${person.membershipId}`;
export const conversationsUrl = `/p/${popkinId}/chat`;

const friday = (hour: number, minute = 0): Date => new Date(2026, 8, 11, hour, minute);

/** The four direct messages the mocks list, in words only, the most recent first. */
export function theMockDirects(): DirectThread[] {
  const [walt, ellie, dev, ruth] = [1, 2, 3, 4].map(directThreadId);
  const to = (id: string) => ({ threadId: id });
  return [
    {
      id: walt,
      other: named(people.walt),
      unreadCount: 1,
      messages: [
        message(
          people.mara,
          'Walt, your pancakes were unreal. Is that your mum’s recipe?',
          saturday(9, 30),
          to(walt),
        ),
        message(
          people.walt,
          'Grandma’s, actually. Buttermilk and a pinch of nutmeg. Don’t tell anyone.',
          saturday(9, 33),
          to(walt),
        ),
        message(people.walt, 'Here’s the card she wrote it on', saturday(9, 34), to(walt)),
        message(
          people.mara,
          'Secret’s safe. Will you make them again tomorrow?',
          saturday(9, 38),
          to(walt),
        ),
        message(people.walt, 'Ha, I’ll save you the corner piece.', saturday(9, 41), to(walt)),
      ],
    },
    {
      id: ellie,
      other: named(people.ellie),
      unreadCount: 0,
      messages: [message(people.mara, 'thanks for the paddles!', saturday(8, 5), to(ellie))],
    },
    {
      id: dev,
      other: named(people.dev),
      unreadCount: 0,
      messages: [
        message(people.dev, 'Did you get the photo of the heron?', friday(18, 0), to(dev)),
      ],
    },
    {
      id: ruth,
      other: named(people.ruth),
      unreadCount: 0,
      messages: [message(people.ruth, 'See you at the dock 💛', friday(16, 30), to(ruth))],
    },
  ];
}

type SendFailure = 'network' | 'server' | 'rate-limited' | 'too-long';

export class Chat {
  /** The recorded thread, with the counts and the end the mocks draw. */
  thread: RecordedThread = {
    ...recordedThread,
    endsAt: new Date(2026, 8, 13, 18, 0).toISOString(),
    memberCount: 14,
    hereNow: 5,
    presenceVersion: 1,
    unreadCount: 0,
    lastReadMessageId: null,
    viewer: { membershipId: people.mara.membershipId, firstName: 'Mara' },
  };
  messages: ChatMessage[] = theMockThread();
  /** Mara's direct messages; one without a message is not listed (L2-022 AC2). */
  directs: DirectThread[] = theMockDirects();
  /** Who a direct message can be opened with: the Popkin's members. */
  members: Named[] = Object.values(people).map(named);
  /** The Everyone card's latest line, where a mock draws another than the thread's last. */
  everyoneLatest?: { firstName: string; text: string; isMine: boolean; sentAt: string };
  /** How many times the list of threads was asked for. */
  listAsked = 0;
  /** The members a direct message was opened with, in order. */
  readonly opened: string[] = [];
  hereNow = [people.walt, people.ellie, people.dev, people.mara, people.ruth];

  /** What the app sent, read and deleted, in order. */
  readonly sent: { clientMessageId: string; text: string }[] = [];
  readonly read: string[] = [];
  readonly discarded: string[] = [];
  /** How many times each page of messages was asked for, by its query. */
  readonly asked: string[] = [];

  /** Makes sends fail this way until it is cleared. */
  failSends: SendFailure | null = null;
  private holdThread?: Promise<void>;
  private failReads = false;
  private holdList?: Promise<void>;
  private failList: 'server' | 'not-found' | false = false;

  constructor(private readonly page: Page) {}

  async install(): Promise<void> {
    await this.page.route('**/photos/call*.jpg', (route) =>
      route.fulfill({
        path: path.join(
          __dirname,
          '../../docs/mocks/assets/images',
          path.basename(new URL(route.request().url()).pathname),
        ),
      }),
    );
    await this.page.route(`**/api/popkins/${popkinId}/**`, (route) => this.answer(route));
  }

  /** The thread never answers until the returned function is called. */
  holdTheThread(): () => void {
    let release: () => void = () => undefined;
    this.holdThread = new Promise((resolve) => (release = resolve));
    return release;
  }

  /** Reading the thread fails on the server until `recover` is called. */
  failTheThread(): void {
    this.failReads = true;
  }

  recover(): void {
    this.failReads = false;
    this.failList = false;
  }

  /** The list of threads never answers until the returned function is called. */
  holdTheList(): () => void {
    let release: () => void = () => undefined;
    this.holdList = new Promise((resolve) => (release = resolve));
    return release;
  }

  /** Reading the list of threads fails this way until `recover` is called. */
  failTheList(how: 'server' | 'not-found' = 'server'): void {
    this.failList = how;
  }

  direct(person: { membershipId: string }): DirectThread {
    const found = this.directs.find((d) => d.other.membershipId === person.membershipId);
    if (!found) throw new Error('No direct message with that member.');
    return found;
  }

  /** The other member writes in a direct message: stored, counted and sent over the hub. */
  async writes(hub: Hub, person: Person, text: string, at = new Date()): Promise<ChatMessage> {
    let thread = this.directs.find((d) => d.other.membershipId === person.membershipId);
    if (!thread) {
      thread = {
        id: directThreadId(this.directs.length + 1),
        other: named(person),
        messages: [],
        unreadCount: 0,
      };
      this.directs.push(thread);
    }
    const added = message(person, text, at, { threadId: thread.id });
    thread.messages.push(added);
    thread.unreadCount++;
    await hub.push('MessageAdded', added);
    return added;
  }

  private listed(): unknown {
    const mine = (m: ChatMessage) => m.author.membershipId === this.thread.viewer.membershipId;
    const last = this.messages.filter((m) => m.kind === 'Member').at(-1);
    const latest = (d: DirectThread) => d.messages.at(-1) as ChatMessage;
    return {
      viewerMembershipId: this.thread.viewer.membershipId,
      everyone: {
        threadId,
        latest:
          this.everyoneLatest ??
          (last
            ? {
                firstName: last.author.firstName,
                text: last.text,
                isMine: mine(last),
                sentAt: last.sentAt,
              }
            : null),
        unreadCount: this.thread.unreadCount,
      },
      direct: this.directs
        .filter((d) => d.messages.length > 0)
        .sort((a, b) => latest(b).sentAt.localeCompare(latest(a).sentAt))
        .map((d) => ({
          threadId: d.id,
          other: { ...d.other, firstName: d.other.displayName.split(' ')[0] },
          latest: { text: latest(d).text, isMine: mine(latest(d)), sentAt: latest(d).sentAt },
          unreadCount: d.unreadCount,
        })),
    };
  }

  private asThread(direct: DirectThread): unknown {
    return {
      ...this.thread,
      id: direct.id,
      kind: 'Direct',
      memberCount: 2,
      unreadCount: direct.unreadCount,
      lastReadMessageId: null,
      other: { ...direct.other, firstName: direct.other.displayName.split(' ')[0] },
    };
  }

  /** Someone else's message, stored and sent to the app over the hub. */
  async arrives(hub: Hub, added: ChatMessage): Promise<void> {
    this.messages.push(added);
    await hub.push('MessageAdded', added);
  }

  private async answer(route: Route): Promise<void> {
    const request = route.request();
    const url = new URL(request.url());
    const rest = url.pathname.split(`/api/popkins/${popkinId}/`)[1];
    const method = request.method();

    if (method === 'GET' && rest === 'threads/everyone') {
      await this.holdThread;
      if (this.failReads) return route.fulfill(asProblem(problem(500, 'server_error')));
      return route.fulfill({ json: { ...this.thread, other: null } });
    }
    if (method === 'GET' && rest === 'threads') {
      this.listAsked++;
      await this.holdList;
      if (this.failList === 'not-found') {
        return route.fulfill(asProblem(problem(404, 'popkin_not_found')));
      }
      if (this.failList) return route.fulfill(asProblem(problem(500, 'server_error')));
      return route.fulfill({ json: this.listed() });
    }
    if (method === 'PUT' && rest.startsWith('threads/direct/')) {
      const memberId = rest.split('/')[2];
      this.opened.push(memberId);
      await this.holdThread;
      if (this.failReads) return route.fulfill(asProblem(problem(500, 'server_error')));
      if (memberId === this.thread.viewer.membershipId) {
        return route.fulfill(asProblem(problem(400, 'cannot_message_self')));
      }
      const existing = this.directs.find((d) => d.other.membershipId === memberId);
      if (existing) return route.fulfill({ status: 200, json: this.asThread(existing) });
      const other = this.members.find((m) => m.membershipId === memberId);
      if (!other) return route.fulfill(asProblem(problem(404, 'member_not_found')));
      if (this.thread.readOnly) {
        return route.fulfill(asProblem(problem(409, 'popkin_wrapped_up')));
      }
      const begun: DirectThread = {
        id: directThreadId(this.directs.length + 1),
        other,
        messages: [],
        unreadCount: 0,
      };
      this.directs.push(begun);
      return route.fulfill({ status: 201, json: this.asThread(begun) });
    }

    if (method === 'GET' && rest === 'presence') {
      return route.fulfill({
        json: {
          version: this.thread.presenceVersion,
          hereNow: this.thread.hereNow,
          members: this.hereNow.map((person) => ({
            membershipId: person.membershipId,
            displayName: displayNames[person.firstName] ?? person.firstName,
            avatar: person.avatar,
          })),
        },
      });
    }
    // What follows is said of one thread: Everyone, or one of the direct messages.
    const named = /^threads\/([0-9a-f-]{36})\/(.*)$/.exec(rest);
    if (!named) return route.fallback();
    const [, id, what] = named;
    const direct = this.directs.find((d) => d.id === id);
    if (id !== threadId && !direct) {
      return route.fulfill(asProblem(problem(404, 'thread_not_found')));
    }
    const held = (): ChatMessage[] => (direct ? direct.messages : this.messages);
    const keep = (messages: ChatMessage[]): void => {
      if (direct) direct.messages = messages;
      else this.messages = messages;
    };
    const at = (messageId: string | null) => held().findIndex((m) => m.id === messageId);

    if (method === 'GET' && what === 'messages') {
      this.asked.push(url.search);
      const query = url.searchParams;
      const all = held();
      if (query.has('before')) {
        const end = at(query.get('before'));
        return route.fulfill({
          json: { items: all.slice(Math.max(0, end - 50), end), hasMore: end > 50 },
        });
      }
      if (query.has('after')) {
        const start = at(query.get('after')) + 1;
        return route.fulfill({
          json: { items: all.slice(start, start + 50), hasMore: all.length > start + 50 },
        });
      }
      if (query.has('from')) {
        return route.fulfill({
          json: {
            items: all.slice(at(query.get('from')), at(query.get('to')) + 1),
            hasMore: false,
          },
        });
      }
      return route.fulfill({ json: { items: all.slice(-50), hasMore: all.length > 50 } });
    }
    if (method === 'POST' && what === 'messages') {
      const body = request.postDataJSON() as { clientMessageId: string; text: string };
      this.sent.push(body);
      switch (this.failSends) {
        case 'network':
          return route.abort('internetdisconnected');
        case 'server':
          return route.fulfill(asProblem(problem(500, 'server_error')));
        case 'rate-limited':
          return route.fulfill(asProblem(problem(429, 'rate_limited', { retryAfterSeconds: 30 })));
        case 'too-long':
          return route.fulfill(asProblem(problem(400, 'message_too_long', { field: 'text' })));
      }
      const stored = held().find((m) => m.clientMessageId === body.clientMessageId);
      if (stored) return route.fulfill({ status: 200, json: stored });
      const added = message(people.mara, body.text, new Date(), {
        clientMessageId: body.clientMessageId,
        threadId: id,
      });
      held().push(added);
      return route.fulfill({ status: 201, json: added });
    }
    if (method === 'PUT' && what === 'read') {
      if (direct) direct.unreadCount = 0;
      this.read.push((request.postDataJSON() as { lastReadMessageId: string }).lastReadMessageId);
      return route.fulfill({ status: 204 });
    }
    if (method === 'DELETE' && what.startsWith('messages/client/')) {
      const clientMessageId = what.split('/').at(-1) ?? '';
      this.discarded.push(clientMessageId);
      keep(held().filter((m) => m.clientMessageId !== clientMessageId));
      return route.fulfill({ status: 204 });
    }
    return route.fallback();
  }
}

function asProblem(answer: { status: number; body?: unknown; headers?: Record<string, string> }) {
  return { status: answer.status, json: answer.body, headers: answer.headers };
}

/** Mara, a member of Lakeside Weekend, with its Everyone thread answering. */
export async function maraInTheChat(page: Page, change?: (chat: Chat) => void): Promise<Chat> {
  const chat = new Chat(page);
  change?.(chat);
  await chat.install();
  chats.set(page, chat);
  return chat;
}

const chats = new WeakMap<Page, Chat>();

export function chatOf(page: Page): Chat {
  const chat = chats.get(page);
  if (!chat) throw new Error('This page has no chat.');
  return chat;
}

/*
 * The states the mocks draw, for the sweeps and the parity specs: each is the step before the
 * page opens, and some have a step after.
 */

/** The thread of the mocks on the mocks' day, Saturday 12 September 2026 at noon. */
export async function theMockChat(page: Page, change?: (chat: Chat) => void): Promise<void> {
  await page.clock.install({ time: mockToday });
  await maraInTheChat(page, change);
}

export async function theChatLoading(page: Page): Promise<void> {
  await theMockChat(page, (chat) => chat.holdTheThread());
}

export async function theChatEmpty(page: Page): Promise<void> {
  await theMockChat(page, (chat) => {
    chat.messages = [];
    chat.thread.memberCount = 1;
    chat.thread.hereNow = 1;
  });
}

export async function theChatFailing(page: Page): Promise<void> {
  await theMockChat(page, (chat) => chat.failTheThread());
}

export async function theChatWhoseSendsFail(page: Page): Promise<void> {
  await theMockChat(page, (chat) => (chat.failSends = 'server'));
}

/** Sends the message the failed-send mock shows. */
export async function sendTheReplyToRuth(page: Page): Promise<void> {
  const chat = new GroupChatPage(page);
  await chat.sendWithEnter('You’re on the list, Ruth!');
  await chat.message('You’re on the list, Ruth!').waitFor();
}

/** Goes offline and writes the two messages the offline mock shows waiting. */
export async function writeTwoOffline(page: Page): Promise<void> {
  const chat = new GroupChatPage(page);
  await chat.texts().first().waitFor();
  await page.context().setOffline(true);
  await chat.sendWithEnter('You’re on the list, Ruth!');
  await chat.sendWithEnter('Back at the dock in ten.');
  await chat.message('Back at the dock in ten.').waitFor();
}

/** Comes back online with two messages waiting: "Back online. 2 messages sent." */
export async function comeBackWithTwo(page: Page): Promise<void> {
  await writeTwoOffline(page);
  await page.context().setOffline(false);
  await new GroupChatPage(page).banner.filter({ hasText: 'Back online.' }).waitFor();
}

/** A thread longer than the screen, read from its top while a message arrives below. */
export async function theChatWithManyMessages(page: Page): Promise<void> {
  await theMockChat(page, (chat) => (chat.messages = aLongThread(60)));
}

export async function aMessageArrivesBelow(page: Page): Promise<void> {
  const chat = new GroupChatPage(page);
  await chat.message('Message 60').waitFor();
  await chat.readBack();
  await chatOf(page).arrives(
    hubOf(page),
    message(people.ruth, 'Anyone seen the paddles?', new Date()),
  );
  await chat.newMessages.waitFor();
}

/**
 * Three unread messages that stay unread: the page is in a background tab, so its latest
 * message is never read. The thread ends on Mara's line, as the list of the mocks shows it.
 */
export async function theChatUnread(page: Page): Promise<void> {
  await page.addInitScript(() =>
    Object.defineProperty(document, 'visibilityState', { get: () => 'hidden' }),
  );
  await theMockChat(page, (chat) => {
    chat.thread.unreadCount = 3;
    chat.messages = [
      ...theMockThread().slice(0, 4),
      message(people.mara, 'last call for the canoe sign-up 🛶', saturday(9, 24)),
    ];
  });
}
