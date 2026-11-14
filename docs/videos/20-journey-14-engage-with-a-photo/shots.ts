import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { chatUrl, maraInTheChat, message, people } from '../../../e2e/fixtures/chat';
import { mockToday } from '../../../e2e/fixtures/journeys';
import { maraOnTheDock } from '../../../e2e/fixtures/photo-talk';
import { albumUrl } from '../../../e2e/fixtures/photos';
import { test } from '../../../e2e/fixtures/pk-test';
import { ChatPhotos } from '../../../e2e/pages/chat-photos';
import { GroupChatPage } from '../../../e2e/pages/group-chat.page';
import { PhotoTalkPage } from '../../../e2e/pages/photo-talk';
import { PhotoViewPage } from '../../../e2e/pages/photo-view.page';
import { detail, frame, shot, type Size, type Theme } from '../../../tools/video-record/shots';

/**
 * The screenshots of video 20: journey 14, Engage with a photo, in the running app. Mara opens
 * the dock photo of Lakeside Weekend in the photo view: they react, take a reaction back, choose
 * More reactions, see a failed reaction put back, comment in the Photo comments dialog on a phone
 * and in the side panel on a desktop, delete their own comment, save the photo and delete it.
 * The answers are those of `e2e/fixtures/photo-talk.ts`, `photos.ts` and `chat.ts`; the hub is
 * `e2e/fixtures/hub.ts` (ADR 0005, ADR 0010); no backend and no database ran. Not a test and not
 * a sweep: only `node tools/video-record/record.mjs docs/videos/20-journey-14-engage-with-a-photo`
 * runs it.
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

/** Takes the pointer and the focus ring away, so a shot shows the state, not the hover. */
async function still(page: Page): Promise<void> {
  await page.mouse.move(0, 0);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
}

/** Mara on the dock photo, at a size and a theme. */
async function onTheDock(
  page: Page,
  size: Size,
  theme: Theme = 'light',
  change?: Parameters<typeof maraOnTheDock>[1],
) {
  await page.clock.install({ time: mockToday });
  await frame(page, size, theme);
  const dock = await maraOnTheDock(page, change);
  await page.goto(dock.url);
  const view = new PhotoViewPage(page);
  await expect(view.root).toBeAttached();
  await view.photo.evaluate((image: HTMLImageElement) => image.decode());
  await pictures(page);
  await still(page);
  return { ...dock, view, page: new PhotoTalkPage(page) };
}

const closeUp = (region: Locator, name: string, pad = 12) => detail(region, name, pad);

/** Mara's own comment, last of four. */
const withMyComment: Parameters<typeof maraOnTheDock>[1] = (dock) =>
  dock.comments?.push({
    id: 'c-mara',
    by: people.mara,
    addedAt: new Date(2026, 8, 12, 9, 12),
    text: 'Up at 6 again tomorrow? Bring the good coffee.',
  });

test('the photo view at every size, and in the dark', async ({ page }) => {
  for (const size of SIZES) {
    await onTheDock(page, size);
    await shot(page, `view-${lower(size)}`);
  }
  await onTheDock(page, 'XS', 'dark');
  await shot(page, 'view-xs-dark');
});

test('a reaction given, taken back, and one from More reactions', async ({ page }) => {
  const { page: talk } = await onTheDock(page, 'XS');
  await closeUp(talk.reactBar, 'react-bar', 10);
  await talk.quick('Heart').click();
  await expect(talk.chip('Heart')).toHaveAccessibleName('Heart, 10, you reacted');
  await still(page);
  await shot(page, 'reacted-xs');
  await closeUp(talk.reactBar, 'react-bar-pressed', 10);
  await closeUp(talk.chip('Heart'), 'chip-pressed', 10);
  await talk.quick('Heart').click();
  await expect(talk.chip('Heart')).toHaveAccessibleName('Heart, 9');
  await still(page);
  await closeUp(talk.chip('Heart'), 'chip-back', 10);
  await talk.moreReactions.click();
  await expect(talk.picker).toBeVisible();
  await page.mouse.move(0, 0);
  await shot(page, 'more-xs');
  await talk.picker.getByRole('button', { name: 'Party popper' }).click();
  await expect(talk.chip('Party popper')).toHaveAccessibleName('Party popper, 1, you reacted');
  await still(page);
  await shot(page, 'party-xs');
});

test('a reaction that fails is put back, with a message', async ({ page }) => {
  const { talk: server, page: talk } = await onTheDock(page, 'XS');
  server.fail('react');
  await talk.quick('Heart').click();
  await expect(talk.says('We couldn’t save your reaction.')).toBeVisible();
  await expect(talk.chip('Heart')).toHaveAccessibleName('Heart, 9');
  await still(page);
  await shot(page, 'react-failed-xs');
  await closeUp(talk.says('We couldn’t save your reaction.'), 'react-failed-toast', 40);
});

test('the Photo comments dialog on a phone', async ({ page }) => {
  const { page: talk } = await onTheDock(page, 'XS');
  await talk.comment.click();
  await expect(talk.dialog).toHaveAccessibleName('3 comments');
  await still(page);
  await shot(page, 'comments-xs');
  await talk.dialogField.fill('Up at 6 again tomorrow?');
  await talk.dialogPost.click();
  await expect(talk.dialog).toHaveAccessibleName('4 comments');
  await still(page);
  await shot(page, 'commented-xs');
  await talk.dialogField.fill(nearLimit);
  await expect(talk.dialogCount).toHaveText('452 / 500');
  await page.mouse.move(0, 0);
  await shot(page, 'near-limit-xs');
});

/** A long comment of 452 characters: past 450, the count shows. */
const nearLimit = (
  'Okay, real talk: this is the best photo of the whole weekend and I will not hear otherwise. ' +
  'The mist on the water, the canoes, the cabin lights still on behind the trees. '
)
  .repeat(4)
  .slice(0, 452);

test('the comments dialog with none yet', async ({ page }) => {
  const { page: talk } = await onTheDock(page, 'XS', 'light', (dock) => (dock.comments = []));
  await talk.comment.click();
  await expect(talk.dialogEmpty).toBeVisible();
  await still(page);
  await shot(page, 'comments-empty-xs');
});

test('one’s own comment deleted after confirming', async ({ page }) => {
  const { page: talk } = await onTheDock(page, 'XS', 'light', withMyComment);
  await talk.comment.click();
  await expect(talk.dialogComments).toHaveCount(4);
  await still(page);
  await closeUp(talk.dialogComments.last(), 'own-comment', 10);
  await talk.deleteOf(talk.dialogComments.last()).click();
  await expect(talk.confirmCommentDelete).toBeVisible();
  await page.mouse.move(0, 0);
  await shot(page, 'delete-comment-xs');
  await talk.confirmCommentDelete.click();
  await expect(talk.dialogComments).toHaveCount(3);
});

test('the same comments in the side panel on a desktop', async ({ page }) => {
  const { page: talk, view } = await onTheDock(page, 'XL');
  await expect(talk.panelComments).toHaveCount(3);
  await talk.panelField.fill('Same time tomorrow');
  await talk.panelPost.click();
  await expect(talk.panelComments).toHaveCount(4);
  await still(page);
  await shot(page, 'panel-xl');
  await closeUp(view.panel, 'panel', 0);
});

test('Save photo and Photo actions, then Delete this photo?', async ({ page }) => {
  const { page: talk, view } = await onTheDock(page, 'XS');
  await closeUp(view.bar, 'bar', 4);
  const download = page.waitForEvent('download');
  await talk.save.click();
  expect((await download).suggestedFilename()).toBe('popkin-photo-20260912-0658.jpg');
  await talk.actions.click();
  await expect(talk.deletePhoto).toBeVisible();
  await page.mouse.move(0, 0);
  await shot(page, 'actions-xs');
  await talk.deletePhoto.click();
  await expect(talk.confirmPhotoDelete).toBeVisible();
  await page.mouse.move(0, 0);
  await shot(page, 'delete-photo-xs');
  await talk.confirmPhotoDelete.click();
  await expect(page).toHaveURL(albumUrl);
  await expect(talk.says('Photo deleted.')).toBeVisible();
  await pictures(page);
  await still(page);
  await shot(page, 'deleted-xs');
});

test('a photo deleted while it is open', async ({ page }) => {
  const { dock, talk: server, page: talk } = await onTheDock(page, 'XS');
  await expect(talk.save).toBeVisible();
  await server.deletedBySomeone(dock);
  await expect(talk.removed).toBeVisible();
  await still(page);
  await shot(page, 'removed-xs');
});

test('a chat message whose photo was deleted', async ({ page }) => {
  await page.clock.install({ time: mockToday });
  await frame(page, 'XS');
  await maraInTheChat(page, (chat) =>
    chat.messages.push(
      message(people.dev, 'Pancakes are up', new Date(mockToday), {
        photo: null,
        photoRemoved: true,
      }),
    ),
  );
  await page.goto(chatUrl);
  const chat = new GroupChatPage(page);
  const removed = chat.message('Pancakes are up');
  await expect(new ChatPhotos(page).removed(removed)).toBeVisible();
  await pictures(page);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await still(page);
  await shot(page, 'chat-removed-xs');
  await closeUp(removed, 'chat-removed', 10);
});

test('a wrapped-up Popkin, read-only', async ({ page }) => {
  const wrapped: Parameters<typeof maraOnTheDock>[1] = (dock, _album, home) => {
    dock.reactions = [
      { emoji: '❤️', count: 10, mine: true },
      { emoji: '😍', count: 4, mine: false },
    ];
    home.popkin.status = 'WrappedUp';
    home.popkin.wrappedUpAt = new Date(2026, 8, 12, 11).toISOString();
  };
  const { page: talk, view } = await onTheDock(page, 'XL', 'light', wrapped);
  await expect(talk.reactBar).toHaveCount(0);
  await expect(talk.panelField).toHaveCount(0);
  await still(page);
  await shot(page, 'wrapped-xl');
  await closeUp(view.panel, 'wrapped-panel', 0);
});
