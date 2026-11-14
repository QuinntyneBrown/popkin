import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import {
  chatOf,
  chatUrl,
  directUrl,
  maraInTheChat,
  people,
  theMockThread,
} from '../../../e2e/fixtures/chat';
import { maraAtHome } from '../../../e2e/fixtures/home';
import { mockToday } from '../../../e2e/fixtures/journeys';
import { type Pk, test } from '../../../e2e/fixtures/pk-test';
import { lines, reactStates } from '../../../e2e/fixtures/react-states';
import type { RouteKey } from '../../../e2e/fixtures/routes';
import { DeleteMessageDialog } from '../../../e2e/pages/delete-message.dialog';
import { DirectMessagePage } from '../../../e2e/pages/direct-message.page';
import { GroupChatPage } from '../../../e2e/pages/group-chat.page';
import { MessageActions } from '../../../e2e/pages/message-actions';
import { ReactionsDialog } from '../../../e2e/pages/reactions.dialog';
import { Toasts } from '../../../e2e/pages/toasts';
import { detail, frame, shot, type Size, type Theme } from '../../../tools/video-record/shots';

/**
 * The screenshots of video 16: journey 12, React and reply, in the running app. Mara, in the
 * Everyone thread of Lakeside Weekend, opens a message's actions, reacts, replies, follows a
 * quote and deletes her own message; then the same in her direct message with Walt. The states
 * are those of `e2e/fixtures/react-states.ts`, opened by their keys in `e2e/fixtures/routes.ts`,
 * and the answers of `e2e/fixtures/chat.ts` and `home.ts`; the hub is `e2e/fixtures/hub.ts`
 * (ADR 0005, ADR 0010); no backend and no database ran. Not a test and not a sweep: only
 * `node tools/video-record/record.mjs docs/videos/16-journey-12-react-and-reply` runs it.
 */

const lower = (size: Size) => size.toLowerCase();
const SIZES = ['XS', 'M', 'L', 'XL'] as const satisfies readonly Size[];

/** Waits until every picture on the page has arrived. */
async function pictures(page: Page): Promise<void> {
  await page.evaluate(() =>
    Promise.all(
      [...document.images].map((image) => image.complete || image.decode().catch(() => undefined)),
    ),
  );
}

/** Takes the pointer and the focus ring away, so a close-up shows the state, not the hover. */
async function still(page: Page): Promise<void> {
  await page.mouse.move(0, 0);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
}

type State = keyof typeof reactStates;

/**
 * Opens one of journey 12's states, as the parity specs do: the answers, the page, the steps.
 * "Replying" has no screen of its own: it is the Everyone thread, `groupChat`, with a step.
 */
async function open(page: Page, pk: Pk, key: State, size: Size, theme: Theme = 'light') {
  await frame(page, size, theme);
  const state = reactStates[key] as {
    before: (page: Page) => Promise<void>;
    app?: (page: Page) => Promise<void>;
  };
  await state.before(page);
  await pk.open((key === 'groupChatReplying' ? 'groupChat' : key) as RouteKey);
  await new GroupChatPage(page).message(lines.ruths).waitFor();
  await state.app?.(page);
  await pictures(page);
}

/** Mara in the Everyone thread at a size, from her own answers rather than a route key. */
async function inTheChat(page: Page, size: Size, change?: Parameters<typeof maraInTheChat>[1]) {
  await page.clock.install({ time: mockToday });
  await frame(page, size);
  const fixture = await maraInTheChat(page, change);
  await page.goto(chatUrl);
  const chat = new GroupChatPage(page);
  await chat.message(lines.ruths).waitFor();
  await pictures(page);
  return { fixture, chat, actions: new MessageActions(page), dialog: new ReactionsDialog(page) };
}

const closeUp = (region: Locator, name: string, pad = 10) => detail(region, name, pad);

test('the Everyone thread with its chips and a quote', async ({ page, pk }) => {
  await open(page, pk, 'groupChat', 'XS');
  await shot(page, 'chat-xs');
  const chat = new GroupChatPage(page);
  await closeUp(chat.message(lines.walts), 'walt-chips');
  await closeUp(chat.message(lines.maras), 'mara-quote');
});

test('the Everyone thread in the dark', async ({ page, pk }) => {
  await open(page, pk, 'groupChat', 'XS', 'dark');
  await shot(page, 'chat-xs-dark');
});

test('Message actions, at every size', async ({ page, pk }) => {
  for (const size of SIZES) {
    await open(page, pk, 'reactions', size);
    await page.mouse.move(0, 0);
    await shot(page, `actions-${lower(size)}`);
    if (size === 'XS') {
      const dialog = new ReactionsDialog(page);
      await closeUp(dialog.panel, 'actions-panel', 0);
      await closeUp(dialog.quickGrid, 'actions-quick', 10);
    }
  }
});

test('More reactions', async ({ page, pk }) => {
  await open(page, pk, 'reactionsMore', 'XS');
  await page.mouse.move(0, 0);
  await shot(page, 'more-xs');
  await closeUp(new ReactionsDialog(page).moreGrid, 'more-grid', 10);
});

test('a heart on Ruth’s message, then taken back', async ({ page }) => {
  const { chat, actions, dialog } = await inTheChat(page, 'XS');
  const ruth = chat.message(lines.ruths);
  await closeUp(ruth, 'ruth-before');
  await actions.openByKeyboard(ruth);
  await dialog.react('heart').click();
  await expect(actions.chip(ruth, 'Heart')).toHaveAccessibleName('Heart, you reacted, 1');
  await still(page);
  await shot(page, 'hearted-xs');
  await closeUp(ruth, 'ruth-hearted');
  await closeUp(actions.chip(ruth, 'Heart'), 'chip-heart', 2);
  await actions.chip(ruth, 'Heart').click();
  await expect(actions.chip(ruth, 'Heart')).toHaveCount(0);
  await still(page);
  await closeUp(ruth, 'ruth-back');
});

test('a reaction from Dev arrives live', async ({ page, hub }) => {
  const { fixture, chat, actions } = await inTheChat(page, 'XS');
  await hub.connected();
  const ruth = fixture.messages.find((m) => m.text === lines.ruths);
  if (!ruth) throw new Error('Ruth’s message is in the mock thread');
  await fixture.reacts(hub, people.dev, ruth, '😂');
  await expect(actions.chip(chat.message(lines.ruths), 'Laughing')).toHaveAccessibleName(
    'Laughing, 1',
  );
  await closeUp(chat.message(lines.ruths), 'ruth-live');
});

test('Pancakes from More reactions on Dev’s message', async ({ page }) => {
  const { chat, actions, dialog } = await inTheChat(page, 'XS');
  const dev = chat.message('Dock was glass this morning');
  await actions.openByKeyboard(dev);
  await dialog.moreReactions.click();
  await dialog.react('pancakes').click();
  await expect(actions.chip(dev, 'Pancakes')).toHaveAccessibleName('Pancakes, you reacted, 1');
  await still(page);
  await closeUp(dev, 'dev-pancakes');
});

test('a reaction that does not save, and Try again', async ({ page }) => {
  const { chat, actions, dialog } = await inTheChat(page, 'XS', (c) => (c.failReactions = true));
  await actions.openByKeyboard(chat.message(lines.ruths));
  await dialog.react('heart').click();
  const toasts = new Toasts(page);
  await expect(toasts.toast).toContainText('We couldn’t save your reaction.');
  await expect.poll(() => actions.chipNames(chat.message(lines.ruths))).toEqual(['Thumbs up, 2']);
  await still(page);
  await shot(page, 'failed-xs');
  await closeUp(toasts.toast, 'failed-toast', 10);
});

test('Copy', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const { chat, actions, dialog } = await inTheChat(page, 'XS');
  await actions.openByKeyboard(chat.message(lines.ruths));
  await dialog.copy.click();
  const toasts = new Toasts(page);
  await expect(toasts.toast).toContainText('Message copied.');
  await still(page);
  await closeUp(toasts.toast, 'copied-toast', 10);
});

test('Reply to Ruth, and the reply with its quote', async ({ page, pk }) => {
  await open(page, pk, 'groupChatReplying', 'XS');
  const chat = new GroupChatPage(page);
  const actions = new MessageActions(page);
  await expect(actions.replyingTo).toHaveText('Replying to Ruth');
  await shot(page, 'replying-xs');
  await closeUp(actions.replyBar, 'reply-bar', 6);
  await chat.sendWithEnter('Done, you’re on the 10 o’clock');
  const reply = chat.message('Done, you’re on the 10 o’clock');
  await expect(actions.quote(reply)).toContainText('Ruth');
  await still(page);
  await shot(page, 'replied-xs');
  await closeUp(reply, 'reply-sent');
});

test('the quote goes to Ellie’s message and marks it', async ({ page }) => {
  const { chat, actions } = await inTheChat(page, 'XS');
  // The mark lasts two seconds: the shots are taken inside them, and checked to be.
  await actions.quote(chat.message(lines.maras)).click();
  const ellie = chat.message(lines.ellies);
  await expect(ellie).toHaveClass(/msg--marked/);
  await page.mouse.move(0, 0);
  await shot(page, 'marked-xs');
  await closeUp(ellie, 'ellie-marked');
  await expect(ellie).toHaveClass(/msg--marked/);
});

test('Delete on Mara’s own message, asked first', async ({ page, pk }) => {
  await open(page, pk, 'reactionsMine', 'XS');
  await page.mouse.move(0, 0);
  await shot(page, 'mine-xs');
  await closeUp(new ReactionsDialog(page).panel, 'mine-panel', 0);
  await open(page, pk, 'deleteMessage', 'XS');
  await page.mouse.move(0, 0);
  await shot(page, 'delete-xs');
  await closeUp(new DeleteMessageDialog(page).panel, 'delete-panel', 0);
});

test('the quote of a deleted message', async ({ page, pk }) => {
  await open(page, pk, 'groupChatDeletedQuote', 'XS');
  const chat = new GroupChatPage(page);
  const actions = new MessageActions(page);
  await expect(actions.quote(chat.message(lines.maras))).toHaveText('Message deleted');
  await shot(page, 'deleted-quote-xs');
  await closeUp(chat.message(lines.maras), 'deleted-quote');
});

test('the same in the direct message with Walt', async ({ page }) => {
  await page.clock.install({ time: mockToday });
  await frame(page, 'XS');
  await maraAtHome(page);
  await page.goto(directUrl(people.walt));
  const dm = new DirectMessagePage(page);
  const actions = new MessageActions(page);
  const dialog = new ReactionsDialog(page);
  await expect(dm.messages).toHaveCount(5);
  await pictures(page);
  await shot(page, 'dm-xs');
  await closeUp(dm.message('Here’s the card she wrote it on'), 'dm-chip');

  const corner = dm.message('Ha, I’ll save you the corner piece.');
  await actions.openByKeyboard(corner);
  await dialog.react('laughing').click();
  await expect(actions.chip(corner, 'Laughing')).toHaveAccessibleName('Laughing, you reacted, 1');
  await actions.openByKeyboard(corner);
  await dialog.reply.click();
  await expect(actions.replyingTo).toHaveText('Replying to Walt');
  await dm.field.fill('Deal.');
  await dm.field.press('Enter');
  await expect(actions.quote(dm.message('Deal.'))).toContainText('Walt');
  expect(chatOf(page).reacted).toHaveLength(1);
  await still(page);
  await shot(page, 'dm-replied-xs');
  await closeUp(corner, 'dm-laughing');
  await closeUp(dm.message('Deal.'), 'dm-reply');
});

test('a wrapped-up Popkin: chips and quotes stay, nothing changes', async ({ page }) => {
  // As the behaviour spec has it: the mock thread, read-only.
  const { chat } = await inTheChat(page, 'XS', (c) => {
    c.thread.readOnly = true;
    c.messages = theMockThread();
  });
  await expect(chat.closed).toBeVisible();
  await shot(page, 'read-only-xs');
  await closeUp(chat.message(lines.walts), 'read-only-chips');
  await closeUp(chat.composer, 'read-only-composer', 6);
});
