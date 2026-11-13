import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { callers, maraWithACall } from '../../../e2e/fixtures/call';
import { chatOf, conversationsUrl, directUrl, people } from '../../../e2e/fixtures/chat';
import { directMessageStates } from '../../../e2e/fixtures/direct-message-states';
import { says } from '../../../e2e/fixtures/far-end';
import { homeNow, maraAtHome } from '../../../e2e/fixtures/home';
import { mockToday } from '../../../e2e/fixtures/journeys';
import { type Pk, test } from '../../../e2e/fixtures/pk-test';
import type { RouteKey } from '../../../e2e/fixtures/routes';
import { ConversationsPage } from '../../../e2e/pages/conversations.page';
import { DirectMessagePage } from '../../../e2e/pages/direct-message.page';
import { NewMessageDialog } from '../../../e2e/pages/new-message.dialog';
import { VideoCallPage } from '../../../e2e/pages/video-call.page';
import { detail, frame, shot, type Size, type Theme } from '../../../tools/video-record/shots';

/**
 * The screenshots of video 11: journey 11, Direct message, in the running app. Mara, in
 * Lakeside Weekend, opens the Chat tab, starts a direct message with Walt, talks with him and
 * calls him. The states are those of `e2e/fixtures/direct-message-states.ts` and the answers of
 * `e2e/fixtures/chat.ts`, `home.ts` and `call.ts`; the hub is `e2e/fixtures/hub.ts`, the
 * microphone and camera `e2e/fixtures/call-device.ts` and Walt's picture on the call
 * `e2e/fixtures/far-end.ts`, all inside the page (ADR 0005, ADR 0010, ADR 0014); no backend, no
 * database, no camera and no second machine ran. Not a test and not a sweep: only
 * `node tools/video-record/record.mjs docs/videos/11-journey-11-direct-message` runs it.
 */

// A call measures sound from the moment it opens; the fake devices stand in for a real camera.
test.use({
  launchOptions: {
    args: [
      '--autoplay-policy=no-user-gesture-required',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
    ],
  },
});

const closeUp = (region: Locator, name: string, pad = 12) => detail(region, name, pad);
const lower = (size: Size) => size.toLowerCase();
const SIZES = ['XS', 'M', 'L', 'XL'] as const satisfies readonly Size[];
const walt = directUrl(people.walt);

/** Waits until every picture on the page has arrived. */
async function pictures(page: Page): Promise<void> {
  await page.evaluate(() =>
    Promise.all(
      [...document.images].map((image) => image.complete || image.decode().catch(() => undefined)),
    ),
  );
}

/** Waits until the thread has finished scrolling its latest message into view. */
async function settled(latest: Locator): Promise<void> {
  let last = '';
  await expect
    .poll(async () => {
      const box = JSON.stringify(await latest.boundingBox());
      const same = box === last;
      last = box;
      return same;
    }, { intervals: [150] })
    .toBe(true);
  await expect(latest).toBeInViewport({ ratio: 1 });
}

/** Scrolls the window, the thread on a phone, back to its top. */
async function toTheTop(page: Page): Promise<void> {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }));
}

type State = keyof typeof directMessageStates;

/** Opens one of journey 11's states, as the parity specs do: the answers, the page, the steps. */
async function open(page: Page, pk: Pk, key: State & RouteKey, size: Size, theme: Theme = 'light') {
  await frame(page, size, theme);
  const state = directMessageStates[key] as {
    before: (page: Page) => Promise<void>;
    app?: (page: Page) => Promise<void>;
  };
  await state.before(page);
  await pk.open(key);
  await state.app?.(page);
}

test('the Chat tab on a phone', async ({ page, pk }) => {
  await open(page, pk, 'conversations', 'XS');
  const chat = new ConversationsPage(page);
  await expect(chat.rows).toHaveCount(4);
  await pictures(page);
  await shot(page, 'list-xs');
  await closeUp(chat.everyone, 'everyone', 10);
  await closeUp(chat.directLabel, 'direct-label', 10);
  await closeUp(chat.row('Walt Brennan').root, 'row-walt', 8);
  await closeUp(chat.row('Ellie Brennan').root, 'row-ellie', 8);
  await closeUp(chat.newMessage, 'new-message-button', 10);
});

test('the Chat tab in the dark', async ({ page, pk }) => {
  await open(page, pk, 'conversations', 'XS', 'dark');
  await expect(new ConversationsPage(page).rows).toHaveCount(4);
  await pictures(page);
  await shot(page, 'list-xs-dark');
});

test('the Chat tab beside the Everyone thread, from 1024 px', async ({ page, pk }) => {
  for (const size of ['M', 'L', 'XL'] as const) {
    await open(page, pk, 'conversations', size);
    await expect(new ConversationsPage(page).rows).toHaveCount(4);
    await pictures(page);
    await shot(page, `list-${lower(size)}`);
  }
});

test('New message: the members, and the search', async ({ page }) => {
  await page.clock.install({ time: mockToday });
  await frame(page, 'XS');
  await maraAtHome(page);
  await page.goto(conversationsUrl);
  const chat = new ConversationsPage(page);
  await expect(chat.rows).toHaveCount(4);
  await chat.newMessage.click();
  const dialog = new NewMessageDialog(page);
  await expect(dialog.members).toHaveCount(13);
  await pictures(page);
  await shot(page, 'new-message-xs');
  await closeUp(dialog.searchField, 'search', 10);

  await dialog.search.fill('tomas');
  await expect(dialog.members).toHaveCount(1);
  await pictures(page);
  await shot(page, 'search-tomas-xs');
  await closeUp(dialog.searchField, 'search-tomas', 10);
  await closeUp(dialog.member('Tomás Rivera'), 'found-tomas', 8);

  await dialog.search.fill('BREN');
  await expect(dialog.members).toHaveCount(2);
  await pictures(page);
  await shot(page, 'search-bren-xs');
  await closeUp(dialog.searchField, 'search-bren', 10);
  await closeUp(dialog.list, 'found-bren', 8);

  await dialog.member('Walt Brennan').click();
  await expect(dialog.root).toBeHidden();
  await expect(page).toHaveURL(walt);
  const direct = new DirectMessagePage(page);
  await expect(direct.messages).toHaveCount(5);
  await pictures(page);
  await shot(page, 'chosen-walt-xs');
});

test('the direct message with Walt, and the two talking', async ({ page, hub }) => {
  await page.clock.install({ time: mockToday });
  await frame(page, 'XS');
  await maraAtHome(page);
  await page.goto(walt);
  const direct = new DirectMessagePage(page);
  await expect(direct.messages).toHaveCount(5);
  await pictures(page);
  await shot(page, 'dm-xs');

  // Every whole screen first: a close-up scrolls the region it saves into view.
  await direct.field.fill('Deal. See you at 8.');
  await shot(page, 'talk-typed-xs');
  await direct.send.click();
  await settled(direct.message('Deal. See you at 8.'));
  await shot(page, 'talk-sent-xs');

  await chatOf(page).writes(hub, people.walt, 'Bring syrup?');
  await expect(direct.messages.last()).toContainText('Bring syrup?');
  await pictures(page);
  await settled(direct.message('Bring syrup?'));
  await shot(page, 'talk-reply-xs');

  await closeUp(direct.message('Deal. See you at 8.'), 'talk-mine', 8);
  await closeUp(direct.message('Bring syrup?'), 'talk-reply', 8);
});

test('the direct message on a phone, close up', async ({ page }) => {
  await page.clock.install({ time: mockToday });
  await frame(page, 'XS');
  await maraAtHome(page);
  await page.goto(walt);
  const direct = new DirectMessagePage(page);
  await expect(direct.messages).toHaveCount(5);
  await pictures(page);
  await closeUp(direct.topBar, 'dm-top-bar', 0);
  await closeUp(direct.titles, 'dm-titles', 10);
  await closeUp(direct.call, 'dm-call', 10);
  await direct.field.fill('Deal. See you at 8.');
  await closeUp(direct.composer, 'talk-composer', 6);
  await toTheTop(page);
  await closeUp(direct.intro, 'dm-intro', 6);
});

test('the direct message at every size', async ({ page, pk }) => {
  for (const size of SIZES) {
    await open(page, pk, 'directMessage', size);
    const direct = new DirectMessagePage(page);
    await expect(direct.messages).toHaveCount(5);
    await pictures(page);
    await shot(page, size === 'XS' ? 'dm-mock-xs' : `dm-${lower(size)}`);
    if (size === 'L') await closeUp(direct.listPane, 'list-pane', 0);
    if (size === 'XL') {
      await closeUp(direct.listPane, 'list-pane-xl', 0);
      await closeUp(direct.personPane, 'person-pane', 0);
      await closeUp(direct.personCall, 'person-call', 10);
    }
  }
});

/** Walt's direct message with a call to read; `arrange` says who is on it already. */
async function withACall(page: Page, size: Size, waltIsOn: boolean): Promise<DirectMessagePage> {
  await frame(page, size);
  await maraWithACall(page, (call, home) => {
    home.chat.direct(people.walt).unreadCount = 0;
    if (!waltIsOn) return;
    call.underWay = true;
    call.others = [callers.walt];
    call.threadId = home.chat.direct(people.walt).id;
  });
  // The date stands still at the mocks' moment; the timers that carry sound and picture go on.
  await page.clock.setFixedTime(homeNow);
  await page.goto(walt);
  const direct = new DirectMessagePage(page);
  await expect(direct.messages).toHaveCount(5);
  await pictures(page);
  return direct;
}

for (const size of ['XS', 'M'] as const) {
  test(`"Call Walt" opens a call between the two of them, at ${size}`, async ({ page }) => {
    const direct = await withACall(page, size, false);
    await direct.call.click();
    const video = new VideoCallPage(page);
    await expect(page).toHaveURL(`${walt}/call`);
    await expect(video.names).toHaveText(['You']);
    await expect.poll(() => video.isPlaying(video.person('You'))).toBe(true);
    await page.clock.setFixedTime(new Date(homeNow.getTime() + 12_000));
    await expect(video.sub).toHaveText('Just you · 0:12');
    await shot(page, `call-alone-${lower(size)}`);
    if (size === 'XS') {
      await closeUp(video.topBar, 'call-alone-top-bar', 0);
      await closeUp(video.controls, 'call-controls', 10);
    }
    await video.leave.click();
    await expect(page).toHaveURL(walt);
  });
}

for (const size of ['XS', 'XL'] as const) {
  test(`Walt is calling: the banner in the direct message, and Join, at ${size}`, async ({ page }) => {
    const direct = await withACall(page, size, true);
    await expect(direct.callBanner).toContainText('1 on the call');
    // On a phone the banner sits above the thread, which opens at its latest message: scroll up.
    await toTheTop(page);
    await expect(direct.callBanner).toBeInViewport({ ratio: 1 });
    await shot(page, `dm-banner-${lower(size)}`);
    if (size === 'XS') await closeUp(direct.callBanner, 'banner', 6);
    await direct.joinCall.click();
    await expect(page).toHaveURL(`${walt}/call`);
    const video = new VideoCallPage(page);
    await expect(video.names).toHaveCount(2);
    await expect(video.person('Walt').video).toBeVisible();
    await expect.poll(() => video.isPlaying(video.person('Walt'))).toBe(true);
    await says(page, callers.walt.membershipId);
    await expect(video.speaking).toHaveCount(1);
    await expect(video.sub).toContainText('Just the two of you');
    await shot(page, `call-two-${lower(size)}`);
    if (size === 'XS') await closeUp(video.topBar, 'call-two-top-bar', 0);
    if (size === 'XL') await closeUp(video.aside, 'call-two-pane', 0);
  });
}

test('a wrapped-up Popkin: the direct message is read-only', async ({ page, pk }) => {
  await open(page, pk, 'directMessageReadOnly', 'XS');
  const direct = new DirectMessagePage(page);
  await expect(direct.messages).toHaveCount(5);
  await expect(direct.closed).toBeVisible();
  await pictures(page);
  await shot(page, 'read-only-xs');
  await closeUp(direct.composer, 'read-only-composer', 6);
});
