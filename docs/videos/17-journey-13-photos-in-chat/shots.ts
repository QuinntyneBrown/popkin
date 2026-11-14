import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import {
  chatUrl,
  directUrl,
  dockPhoto,
  maraInTheChat,
  message,
  people,
  saturday,
  theMockThread,
} from '../../../e2e/fixtures/chat';
import { chatPhotoStates, devsPhotoLine } from '../../../e2e/fixtures/chat-photo-states';
import { maraAtHome } from '../../../e2e/fixtures/home';
import { mockToday } from '../../../e2e/fixtures/journeys';
import { aFileOf, aPhoto, photoUrl, withTheAlbum } from '../../../e2e/fixtures/photos';
import { type Pk, test } from '../../../e2e/fixtures/pk-test';
import { ChatPhotos } from '../../../e2e/pages/chat-photos';
import { DirectMessagePage } from '../../../e2e/pages/direct-message.page';
import { GroupChatPage } from '../../../e2e/pages/group-chat.page';
import { PhotoViewPage } from '../../../e2e/pages/photo-view.page';
import {
  bringToTop,
  detail,
  frame,
  shot,
  type Size,
  type Theme,
} from '../../../tools/video-record/shots';

/**
 * The screenshots of video 17: journey 13, Photos in chat, in the running app. Mara, in the
 * Everyone thread of Lakeside Weekend, chooses "Photo", sees it above the field, sends it, has a
 * file refused, sees Walt's photo arrive and opens Dev's full screen; then the same in her direct
 * message with Walt, and the thread of a wrapped-up Popkin. The states are those of
 * `e2e/fixtures/chat-photo-states.ts`, opened by their keys in `e2e/fixtures/routes.ts`, and the
 * answers of `e2e/fixtures/chat.ts`, `home.ts` and `photos.ts`; the hub is `e2e/fixtures/hub.ts`
 * (ADR 0005, ADR 0010); no backend and no database ran. Not a test and not a sweep: only
 * `node tools/video-record/record.mjs docs/videos/17-journey-13-photos-in-chat` runs it.
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

/**
 * Brings the latest message into view. The window is what scrolls in the thread, under its sticky
 * bar, and a picture that arrives after its message grows the page below the view.
 */
async function latest(page: Page): Promise<void> {
  await pictures(page);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.evaluate(
    () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
  );
}

type State = keyof typeof chatPhotoStates;

/** Opens one of journey 13's states, as the parity specs do: the answers, the page, the steps. */
async function open(page: Page, pk: Pk, key: State, size: Size, theme: Theme = 'light') {
  await frame(page, size, theme);
  const state = chatPhotoStates[key] as {
    before: (page: Page) => Promise<void>;
    app?: (page: Page) => Promise<void>;
  };
  await state.before(page);
  await pk.open(key);
  await new GroupChatPage(page).message(devsPhotoLine).waitFor();
  await state.app?.(page);
  await pictures(page);
  await still(page);
}

/** Mara in the Everyone thread at a size, from her own answers rather than a route key. */
async function inTheChat(
  page: Page,
  size: Size,
  theme: Theme = 'light',
  change?: Parameters<typeof maraInTheChat>[1],
) {
  await page.clock.install({ time: mockToday });
  await frame(page, size, theme);
  const fixture = await maraInTheChat(page, change);
  await page.goto(chatUrl);
  const chat = new GroupChatPage(page);
  await chat.message(devsPhotoLine).waitFor();
  await pictures(page);
  return { fixture, chat, photos: new ChatPhotos(page) };
}

/**
 * Types the text and sends it with Enter, a frame apart: Enter in the same frame as the typing
 * sends the message but can leave its text in the field, which is not what a person sees.
 */
async function typeAndSend(page: Page, field: Locator, text: string): Promise<void> {
  await field.fill(text);
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => done(null))));
  await field.press('Enter');
  await expect(field).toHaveValue('');
}

const closeUp = (region: Locator, name: string, pad = 10) => detail(region, name, pad);

test('the Everyone thread with Dev’s photo, at every size and in the dark', async ({ page }) => {
  for (const size of SIZES) {
    const { chat } = await inTheChat(page, size);
    await still(page);
    await shot(page, `chat-${lower(size)}`);
    if (size === 'XS') {
      // Clear of the sticky bar, which would cover the top of the photo.
      await bringToTop(chat.message(devsPhotoLine), 120);
      await closeUp(chat.message(devsPhotoLine), 'dev-photo');
    }
  }
  await inTheChat(page, 'XS', 'dark');
  await still(page);
  await shot(page, 'chat-xs-dark');
});

test('a photo chosen, above the field, at every size', async ({ page, pk }) => {
  for (const size of SIZES) {
    await open(page, pk, 'groupChatPhotoPreview', size);
    await shot(page, `preview-${lower(size)}`);
  }
});

test('Photo, the preview with Remove photo, then sent with and without text', async ({ page }) => {
  const { chat, photos } = await inTheChat(page, 'XS');
  await closeUp(chat.composer, 'composer', 6);
  await photos.pick(aPhoto('lake.jpg'));
  await photos.previewImage.evaluate((image: HTMLImageElement) => image.decode());
  await expect(photos.remove).toBeVisible();
  await still(page);
  await shot(page, 'picked-xs');
  await closeUp(chat.composer, 'picked-composer', 6);

  await typeAndSend(page, chat.field, 'Look at the lake');
  const mine = chat.message('Look at the lake');
  await expect(photos.photo(mine)).toHaveAccessibleName('Open your photo');
  await expect(photos.preview).toHaveCount(0);
  await pictures(page);
  await latest(page);
  await still(page);
  await shot(page, 'sent-xs');
  await closeUp(mine, 'sent-with-text');

  await photos.pick(aPhoto('lake.jpg'));
  await chat.send.click();
  await expect(photos.preview).toHaveCount(0);
  const last = chat.messages.last();
  await expect(photos.photo(last)).toHaveAccessibleName('Open your photo');
  await expect(photos.photo(last)).toHaveAttribute('href', /photos\//);
  await pictures(page);
  await latest(page);
  await still(page);
  await closeUp(last, 'sent-no-text');
});

test('a file of 14 MB, and a file that is not a photo, refused', async ({ page, pk }) => {
  await open(page, pk, 'groupChatPhotoRefused', 'XS');
  const photos = new ChatPhotos(page);
  await expect(photos.refusal).toContainText('This file is 14 MB. Photos can be up to 10 MB.');
  await shot(page, 'refused-xs');
  await closeUp(photos.refusal, 'refused-size', 8);
  await photos.dismiss.click();
  await expect(photos.refusal).toHaveCount(0);
  await photos.pick(aFileOf(1, 'menu.pdf', 'application/pdf'));
  await expect(photos.refusal).toContainText('JPEG, PNG, WebP or HEIC');
  await still(page);
  await closeUp(photos.refusal, 'refused-type', 8);
});

test('a photo from Walt arrives live', async ({ page, hub }) => {
  const { fixture, chat, photos } = await inTheChat(page, 'XS');
  await hub.connected();
  await fixture.arrives(
    hub,
    message(people.walt, 'Pancakes are up', new Date(mockToday), {
      photo: { ...dockPhoto, id: '30000000-0000-4000-8000-000000000777', url: '/photos/lake.jpg' },
    }),
  );
  const walts = chat.message('Pancakes are up');
  await expect(photos.photo(walts)).toHaveAccessibleName('Open photo from Walt');
  await pictures(page);
  await latest(page);
  await still(page);
  await shot(page, 'live-xs');
  await closeUp(walts, 'walt-live');
});

test('Dev’s photo full screen, at every size', async ({ page }) => {
  for (const size of SIZES) {
    const { chat, photos } = await inTheChat(page, size);
    // Sent in Everyone, Dev's photo is in the album too, under his name (L2-026 AC3).
    const album = await withTheAlbum(page);
    album.shots = [
      {
        ...album.shots[0],
        id: dockPhoto.id,
        caption: null,
        by: people.dev,
        takenAt: saturday(8, 40),
        addedAt: saturday(8, 40),
      },
      ...album.shots,
    ];
    if (size === 'XS') {
      await photos.photo(chat.message(devsPhotoLine)).click();
    } else {
      await page.goto(photoUrl(dockPhoto.id));
    }
    const view = new PhotoViewPage(page);
    await expect(view.root).toBeAttached();
    await view.photo.evaluate((image: HTMLImageElement) => image.decode());
    await pictures(page);
    await still(page);
    await shot(page, `view-${lower(size)}`);
    if (size === 'XL') await closeUp(view.panelBy, 'view-by', 12);
  }
});

test('a photo in the direct message with Walt', async ({ page }) => {
  await page.clock.install({ time: mockToday });
  await frame(page, 'XS');
  await maraAtHome(page);
  await page.goto(directUrl(people.walt));
  const dm = new DirectMessagePage(page);
  const photos = new ChatPhotos(page);
  await expect(dm.messages).toHaveCount(5);
  await photos.pick(aPhoto('lake.jpg'));
  await typeAndSend(page, dm.field, 'For you');
  const mine = dm.message('For you');
  await expect(photos.photo(mine)).toHaveAccessibleName('Open your photo');
  await pictures(page);
  await latest(page);
  await still(page);
  await shot(page, 'dm-xs');
  await closeUp(mine, 'dm-photo');
});

test('a wrapped-up Popkin: the photos open, and no Photo', async ({ page }) => {
  const { chat, photos } = await inTheChat(page, 'XS', 'light', (c) => {
    c.thread.readOnly = true;
    c.messages = theMockThread();
  });
  await expect(chat.closed).toBeVisible();
  await expect(photos.choose).toHaveCount(0);
  await still(page);
  await shot(page, 'read-only-xs');
  await closeUp(chat.composer, 'read-only-composer', 6);
});
