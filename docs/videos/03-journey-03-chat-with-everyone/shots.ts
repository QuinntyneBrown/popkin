import type { Locator, Page } from '@playwright/test';
import {
  type Chat,
  type ChatMessage,
  maraInTheChat,
  message,
  people,
  popkinId,
  saturday,
  theMockThread,
  threadId,
} from '../../../e2e/fixtures/chat';
import { mockToday } from '../../../e2e/fixtures/journeys';
import { test } from '../../../e2e/fixtures/pk-test';
import { GroupChatPage } from '../../../e2e/pages/group-chat.page';
import { SIZES, detail, frame, shot, type Size } from '../../../tools/video-record/shots';

/**
 * The screenshots of video 03: journey 3, Chat with everyone, in the running app. Every /api
 * request is answered by the chat stub of `e2e/fixtures/chat.ts` or the recording, and the hub by
 * `e2e/fixtures/hub.ts` (ADR 0005, ADR 0010); no backend ran. Not a test and not a sweep: only
 * `node tools/video-record/record.mjs docs/videos/03-journey-03-chat-with-everyone` runs it.
 */
const sizes = Object.keys(SIZES) as Size[];

/**
 * Mara in the Everyone thread of Lakeside Weekend, on the mocks' day (Saturday 12 September 2026,
 * noon on the device). The chat stub stamps what Mara sends with the real clock of the machine
 * that takes the pictures; here a sent message is stored a minute after noon on the mocks' day
 * instead, so the thread stays one "Today". Failures are left to the stub.
 */
async function maraOnSaturday(page: Page, change?: (chat: Chat) => void): Promise<Chat> {
  await page.clock.install({ time: mockToday });
  const chat = await maraInTheChat(page, change);
  let minute = 1;
  await page.route(`**/api/popkins/${popkinId}/threads/${threadId}/messages`, async (route) => {
    const request = route.request();
    if (request.method() !== 'POST' || chat.failSends) return route.fallback();
    const body = request.postDataJSON() as { clientMessageId: string; text: string };
    chat.sent.push(body);
    let stored = chat.messages.find((m) => m.clientMessageId === body.clientMessageId);
    if (!stored) {
      stored = message(people.mara, body.text, saturday(12, minute++), {
        clientMessageId: body.clientMessageId,
      });
      chat.messages.push(stored);
    }
    await route.fulfill({ status: 201, json: stored });
  });
  return chat;
}

/** Brings a region to the middle of the window, clear of the top bar and the message field. */
const centre = (region: Locator) =>
  region.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));

/** A morning of messages after the ones the mocks draw: a thread longer than a phone. */
function aBusyMorning(): ChatMessage[] {
  const lines: [(typeof people)[keyof typeof people], string][] = [
    [people.walt, 'Two canoes are down at the dock'],
    [people.dev, 'I’ll take the red one'],
    [people.ellie, 'Life jackets are in the blue bin'],
    [people.ruth, 'Sunscreen, everyone'],
    [people.mara, 'Lunch is at one, on the porch'],
    [people.walt, 'I’m on grill duty'],
    [people.dev, 'Who has the speaker?'],
    [people.ellie, 'It’s charging in the main cabin'],
    [people.ruth, 'The loons are out past the point'],
    [people.mara, 'Photos or it didn’t happen'],
    [people.walt, 'Back by noon, promise'],
    [people.dev, 'Water is colder than it looks'],
    [people.ellie, 'Towels are on the line'],
    [people.ruth, 'Saving you all a seat on the porch'],
  ];
  return lines.map(([who, text], i) => message(who, text, saturday(9, 40 + i * 9)));
}

test('the thread at every form factor, and in the dark', async ({ page, pk }) => {
  await maraOnSaturday(page);
  const chat = new GroupChatPage(page);
  const open = async () => {
    await pk.open('groupChat');
    await chat.message('Put me down for the 10 o’clock boat').waitFor();
  };
  for (const size of sizes) {
    await frame(page, size);
    await open();
    await shot(page, `thread-${size.toLowerCase()}`);
    if (size === 'XS') {
      await detail(chat.topBar, 'thread-header', 0);
      await detail(chat.notes.first(), 'thread-note', 10);
      await detail(chat.message('Pancakes at the main cabin'), 'thread-theirs', 12);
      await detail(chat.message('On it! Also: last call'), 'thread-mine', 12);
    }
    if (size === 'M') await detail(chat.nav, 'thread-rail', 0);
    if (size === 'L') await detail(chat.listPane, 'thread-list-pane', 0);
    if (size === 'XL') await detail(chat.detailPane, 'thread-detail-pane', 0);
  }
  await frame(page, 'XS', 'dark');
  await open();
  await shot(page, 'thread-xs-dark');
  await frame(page, 'XL', 'dark');
  await open();
  await shot(page, 'thread-xl-dark');
});

test('sending a message', async ({ page, pk }) => {
  await maraOnSaturday(page);
  const chat = new GroupChatPage(page);
  await frame(page, 'XS');
  await pk.open('groupChat');
  await chat.message('Put me down for the 10 o’clock boat').waitFor();

  await chat.type('Canoes leave at ten');
  await shot(page, 'send-typed-xs');
  await detail(chat.composer, 'send-typed', 0);

  await chat.field.press('Enter');
  const sent = chat.message('Canoes leave at ten');
  await sent.waitFor();
  await chat.timeOf(sent).waitFor();
  await shot(page, 'send-sent-xs');
  await centre(sent);
  await detail(sent, 'send-sent', 12);
  await detail(chat.composer, 'send-empty', 0);

  await chat.field.pressSequentially('Bring:');
  await chat.field.press('Shift+Enter');
  await chat.field.pressSequentially('paddles');
  await detail(chat.composer, 'send-two-lines', 0);

  // 2,000 characters and one more, which the field does not accept (L2-021 AC7).
  const sentence = 'Bring paddles, sunscreen, a towel and a snack for the boat. ';
  await chat.type(sentence.repeat(40).slice(0, 2000));
  await chat.field.pressSequentially('!');
  await chat.count.waitFor();
  await detail(chat.count, 'send-count', 10);
  await detail(chat.composer, 'send-full', 0);
});

test('a message arrives live', async ({ page, pk, hub }) => {
  const thread = await maraOnSaturday(page);
  const chat = new GroupChatPage(page);
  await frame(page, 'XS');
  await pk.open('groupChat');
  await chat.message('Put me down for the 10 o’clock boat').waitFor();

  await thread.arrives(hub, message(people.walt, 'Kettle is on', saturday(12, 1)));
  const arrived = chat.message('Kettle is on');
  await arrived.waitFor();
  await shot(page, 'live-xs');
  await centre(arrived);
  await detail(arrived, 'live-arrived', 12);
});

test('reading older messages while one arrives', async ({ page, pk, hub }) => {
  const thread = await maraOnSaturday(page, (chat) => {
    chat.messages = [...theMockThread(), ...aBusyMorning()];
  });
  const chat = new GroupChatPage(page);
  await frame(page, 'XS');
  await pk.open('groupChat');
  await chat.message('Saving you all a seat').waitFor();

  await chat.readBack();
  await thread.arrives(hub, message(people.ruth, 'Anyone seen the paddles?', saturday(12, 2)));
  await chat.newMessages.waitFor();
  await shot(page, 'new-messages-xs');
  await detail(chat.newMessages, 'new-messages', 8);

  await chat.newMessages.click();
  await chat.newMessages.waitFor({ state: 'detached' });
  await shot(page, 'new-messages-latest-xs');
  const latest = chat.message('Anyone seen the paddles?');
  await centre(latest);
  await detail(latest, 'new-messages-latest', 12);
});

test('a message that cannot be sent, and "Try again"', async ({ page, pk }) => {
  const thread = await maraOnSaturday(page, (chat) => (chat.failSends = 'server'));
  const chat = new GroupChatPage(page);
  await frame(page, 'XS');
  await pk.open('groupChat');
  await chat.message('Put me down for the 10 o’clock boat').waitFor();

  await chat.sendWithEnter('You’re on the list, Ruth!');
  const failed = chat.message('You’re on the list, Ruth!');
  await chat.tryAgainOn(failed).waitFor();
  await shot(page, 'failed-xs');
  await centre(failed);
  await detail(failed, 'failed-message', 12);

  thread.failSends = null;
  await chat.tryAgainOn(failed).click();
  await chat.statusOf(failed).waitFor({ state: 'detached' });
  await chat.timeOf(failed).waitFor();
  await shot(page, 'retried-xs');
  await centre(failed);
  await detail(failed, 'retried-message', 12);
});

test('offline, and back', async ({ page, pk, context }) => {
  await maraOnSaturday(page);
  const chat = new GroupChatPage(page);
  await frame(page, 'XS');
  await pk.open('groupChat');
  await chat.message('Put me down for the 10 o’clock boat').waitFor();

  await context.setOffline(true);
  await chat.banner.waitFor();
  await chat.sendWithEnter('You’re on the list, Ruth!');
  await chat.sendWithEnter('Back at the dock in ten.');
  const first = chat.message('You’re on the list, Ruth!');
  const waiting = chat.message('Back at the dock in ten.');
  await chat.statusOf(waiting).waitFor();
  // The banner sits above the top bar, at the top of the page; the waiting messages at its end.
  await chat.readBack();
  await shot(page, 'offline-xs');
  await detail(chat.banner, 'offline-banner', 0);
  await centre(first);
  await shot(page, 'offline-waiting-xs');
  await detail(first, 'offline-waiting-1', 12);
  await centre(waiting);
  await detail(waiting, 'offline-waiting-2', 12);

  await context.setOffline(false);
  await chat.banner.filter({ hasText: 'Back online.' }).waitFor();
  await chat.statusOf(waiting).waitFor({ state: 'detached' });
  await chat.readBack();
  await shot(page, 'online-xs');
  await detail(chat.banner, 'online-banner', 0);
  await centre(waiting);
  await shot(page, 'online-sent-xs');
});
