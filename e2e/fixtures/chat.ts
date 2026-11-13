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
    const at = (id: string | null) => this.messages.findIndex((m) => m.id === id);

    if (method === 'GET' && rest === 'threads/everyone') {
      await this.holdThread;
      if (this.failReads) return route.fulfill(asProblem(problem(500, 'server_error')));
      return route.fulfill({ json: this.thread });
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
    if (method === 'GET' && rest === `threads/${threadId}/messages`) {
      this.asked.push(url.search);
      const query = url.searchParams;
      const all = this.messages;
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
    if (method === 'POST' && rest === `threads/${threadId}/messages`) {
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
      const stored = this.messages.find((m) => m.clientMessageId === body.clientMessageId);
      if (stored) return route.fulfill({ status: 200, json: stored });
      const added = message(people.mara, body.text, new Date(), {
        clientMessageId: body.clientMessageId,
      });
      this.messages.push(added);
      return route.fulfill({ status: 201, json: added });
    }
    if (method === 'PUT' && rest === `threads/${threadId}/read`) {
      this.read.push((request.postDataJSON() as { lastReadMessageId: string }).lastReadMessageId);
      return route.fulfill({ status: 204 });
    }
    if (method === 'DELETE' && rest.startsWith(`threads/${threadId}/messages/client/`)) {
      const clientMessageId = rest.split('/').at(-1) ?? '';
      this.discarded.push(clientMessageId);
      this.messages = this.messages.filter((m) => m.clientMessageId !== clientMessageId);
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

function chatOf(page: Page): Chat {
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
