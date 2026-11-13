import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { type Pk, test } from '../../../e2e/fixtures/pk-test';
import type { RouteKey } from '../../../e2e/fixtures/routes';
import { wrapUpStates } from '../../../e2e/fixtures/wrap-up-states';
import { ExperienceDetailPage } from '../../../e2e/pages/experience-detail.page';
import { ExperiencesPage } from '../../../e2e/pages/experiences.page';
import { GroupChatPage } from '../../../e2e/pages/group-chat.page';
import { PhotoAlbumPage } from '../../../e2e/pages/photo-album.page';
import { PopkinHomePage } from '../../../e2e/pages/popkin-home.page';
import { PopkinSettingsDialog } from '../../../e2e/pages/popkin-settings.dialog';
import { RecapPage } from '../../../e2e/pages/recap.page';
import { WrapUpBanner } from '../../../e2e/pages/wrap-up-banner';
import { WrapUpPage } from '../../../e2e/pages/wrap-up.page';
import { bringToTop, detail, frame, shot, type Size, type Theme } from '../../../tools/video-record/shots';

/**
 * The screenshots of video 09: journey 9, Wrap up, in the running app. Every state is one of
 * `e2e/fixtures/wrap-up-states.ts`, opened by its key in `e2e/fixtures/routes.ts`; every /api
 * request is answered in memory by `e2e/fixtures/wrap-up.ts`, the home's, the album's and the
 * experiences' stubs or the recording (ADR 0005); no backend and no database ran. The Popkin is
 * the mocks' Lakeside Weekend, whose Host is Mara. Not a test and not a sweep: only
 * `node tools/video-record/record.mjs docs/videos/09-journey-09-wrap-up` runs it.
 */

type StateKey = keyof typeof wrapUpStates;
interface State {
  before: (page: Page) => Promise<void>;
  app?: (page: Page) => Promise<void>;
}

const closeUp = (region: Locator, name: string, pad = 12) => detail(region, name, pad);
const lower = (size: Size) => size.toLowerCase();

/** Waits until every picture on the page has arrived. */
async function pictures(page: Page): Promise<void> {
  await page.evaluate(() =>
    Promise.all(
      [...document.images].map((image) => image.complete || image.decode().catch(() => undefined)),
    ),
  );
}

/** Opens a state of wrapping up as the sweeps and the parity specs do, at a size and a theme. */
async function open(
  page: Page,
  pk: Pk,
  key: StateKey,
  size: Size = 'XS',
  theme: Theme = 'light',
  ready?: () => Promise<void>,
): Promise<void> {
  const state: State = wrapUpStates[key];
  await frame(page, size, theme);
  await state.before(page);
  await pk.open(key as RouteKey);
  await ready?.();
  await state.app?.(page);
  await pictures(page);
}

test('the Popkin home, then Popkin settings with "Wrap up"', async ({ page, pk }) => {
  const home = new PopkinHomePage(page);
  await open(page, pk, 'popkinSettings', 'XS', 'light', async () => {
    await home.memberRows.first().waitFor();
    await pictures(page);
    await shot(page, 'home-xs');
    await closeUp(home.header, 'home-header', 0);
  });
  const settings = new PopkinSettingsDialog(page);
  await expect(settings.wrapUp).toBeVisible();
  await shot(page, 'settings-xs');
  await closeUp(settings.panel, 'settings-dialog', 0);
  await closeUp(settings.wrapUp, 'settings-wrap-up', 8);
});

for (const size of ['XS', 'M', 'XL'] as const satisfies readonly Size[]) {
  test(`the wrap-up screen at ${size}`, async ({ page, pk }) => {
    const wrapUp = new WrapUpPage(page);
    await open(page, pk, 'wrapUp', size);
    await expect(wrapUp.heading).toHaveText('Wrap up Lakeside Weekend?');
    await expect(wrapUp.factRows.first()).toBeVisible();
    await pictures(page);
    await shot(page, `wrap-up-${lower(size)}`);
    if (size === 'XS') {
      await closeUp(wrapUp.heading, 'wrap-up-heading', 10);
      await closeUp(wrapUp.lead, 'wrap-up-lead', 10);
      await closeUp(wrapUp.facts, 'wrap-up-facts', 8);
      await closeUp(wrapUp.keepRow, 'keep-on', 8);
      await closeUp(wrapUp.wrapItUp, 'wrap-it-up', 10);
    }
    if (size === 'M') await closeUp(wrapUp.picture, 'wrap-up-picture-m', 0);
  });
}

test('the wrap-up screen with the album not kept, and while it is sent', async ({ page, pk }) => {
  const wrapUp = new WrapUpPage(page);
  await open(page, pk, 'wrapUpAlbumOff');
  await expect(wrapUp.keepLine).toHaveText('Photos are removed after 30 days');
  await shot(page, 'wrap-up-album-off-xs');
  await closeUp(wrapUp.keepRow, 'keep-off', 8);
});

test('"Wrapping up…" while it is sent', async ({ page, pk }) => {
  const wrapUp = new WrapUpPage(page);
  await open(page, pk, 'wrapUpSubmitting');
  await expect(wrapUp.wrapItUp).toHaveText('Wrapping up…');
  await shot(page, 'wrapping-up-xs');
  await closeUp(wrapUp.wrapItUp, 'wrapping-up', 10);
});

for (const size of ['XS', 'M', 'L', 'XL'] as const satisfies readonly Size[]) {
  test(`the recap for a member at ${size}`, async ({ page, pk }) => {
    const recap = new RecapPage(page);
    await open(page, pk, 'recap', size);
    await expect(recap.heading).toHaveText('This Popkin wrapped up. What a time.');
    await expect(recap.prints).toHaveCount(3);
    await pictures(page);
    await shot(page, `recap-${lower(size)}`);
    if (size === 'XS') {
      await closeUp(recap.lead, 'recap-lead', 0);
      await closeUp(recap.people, 'recap-people', 10);
      await closeUp(recap.stats, 'recap-stats', 10);
      await closeUp(recap.moment, 'recap-moment', 10);
      await closeUp(recap.card, 'recap-card', 8);
      await closeUp(recap.actions, 'actions-member', 10);
      await closeUp(recap.startYourOwn, 'start-your-own', 10);
      await closeUp(recap.saveTheAlbum, 'save-the-album', 10);
      await bringToTop(recap.card, 24);
      await shot(page, 'recap-card-xs');
      await bringToTop(recap.actions, 420);
      await shot(page, 'recap-actions-xs');
    }
    if (size === 'XL') await closeUp(recap.rest, 'recap-rest-xl', 0);
  });
}

test('the recap in the dark', async ({ page, pk }) => {
  const recap = new RecapPage(page);
  await open(page, pk, 'recap', 'XS', 'dark');
  await expect(recap.prints).toHaveCount(3);
  await pictures(page);
  await shot(page, 'recap-xs-dark');
});

for (const size of ['XS', 'XL'] as const satisfies readonly Size[]) {
  test(`the recap for the Host at ${size}`, async ({ page, pk }) => {
    const recap = new RecapPage(page);
    await open(page, pk, 'recapHost', size);
    await expect(recap.popUpAnother).toBeVisible();
    await expect(recap.prints).toHaveCount(3);
    await pictures(page);
    await shot(page, `recap-host-${lower(size)}`);
    if (size === 'XS') {
      await closeUp(recap.actions, 'actions-host', 10);
      await closeUp(recap.popUpAnother, 'pop-up-another', 10);
      await bringToTop(recap.actions, 420);
      await shot(page, 'recap-host-actions-xs');
    }
  });
}

test('"Save the album": the zip being prepared', async ({ page, pk }) => {
  const recap = new RecapPage(page);
  await open(page, pk, 'recapExporting');
  await expect(recap.progressText).toHaveText('Preparing 12 of 48');
  await closeUp(recap.actions, 'actions-exporting', 10);
  await closeUp(recap.progress, 'progress', 16);
  await bringToTop(recap.actions, 420);
  await shot(page, 'recap-exporting-xs');
});

test('the recap of a Popkin whose album was not kept', async ({ page, pk }) => {
  const recap = new RecapPage(page);
  await open(page, pk, 'recapGoing');
  await expect(recap.photosGo).toContainText('Photos go in 12 days.');
  await expect(recap.prints).toHaveCount(3);
  await pictures(page);
  await shot(page, 'recap-going-xs');
  await closeUp(recap.photosGo, 'photos-go', 0);
});

test('the last hour on the Popkin home, for the Host', async ({ page, pk }) => {
  const home = new PopkinHomePage(page);
  const banner = new WrapUpBanner(page);
  await open(page, pk, 'popkinHomeLastHour');
  await home.memberRows.first().waitFor();
  await expect(banner.lead).toHaveText('1 hour left.');
  await pictures(page);
  await shot(page, 'last-hour-xs');
  await closeUp(banner.root, 'banner-host', 0);
});

test('the last hour on the Popkin home, for a member', async ({ page, pk }) => {
  const home = new PopkinHomePage(page);
  const banner = new WrapUpBanner(page);
  await open(page, pk, 'popkinHomeLastHourMember');
  await home.memberRows.first().waitFor();
  await expect(banner.lead).toBeVisible();
  await pictures(page);
  await shot(page, 'last-hour-member-xs');
  await closeUp(banner.root, 'banner-member', 0);
});

for (const size of ['XS', 'XL'] as const satisfies readonly Size[]) {
  test(`the Everyone thread of a wrapped-up Popkin at ${size}`, async ({ page, pk }) => {
    const chat = new GroupChatPage(page);
    await open(page, pk, 'groupChatReadOnly', size);
    await expect(chat.closed).toBeVisible();
    await expect(chat.messages.first()).toBeVisible();
    await pictures(page);
    await shot(page, `chat-read-only-${lower(size)}`);
    if (size === 'XS') {
      await closeUp(chat.composer, 'chat-closed', 0);
      await closeUp(chat.topBar, 'chat-top-bar', 0);
    }
  });
}

test('Photos of a wrapped-up Popkin whose album is kept', async ({ page, pk }) => {
  const album = new PhotoAlbumPage(page);
  await open(page, pk, 'photoAlbumWrapped');
  await expect(album.thumbnails.first()).toBeVisible();
  await pictures(page);
  await shot(page, 'photos-wrapped-xs');
  await closeUp(album.header, 'photos-header', 0);
});

test('Photos while the album that was not kept has days left', async ({ page, pk }) => {
  const album = new PhotoAlbumPage(page);
  await open(page, pk, 'photoAlbumGoing');
  await expect(album.thumbnails.first()).toBeVisible();
  await pictures(page);
  await shot(page, 'photos-going-xs');
  await closeUp(new WrapUpBanner(page).root, 'banner-photos-go', 0);
});

test('Photos once they were removed', async ({ page, pk }) => {
  const album = new PhotoAlbumPage(page);
  await open(page, pk, 'photoAlbumRemoved');
  await expect(album.empty).toBeVisible();
  await shot(page, 'photos-removed-xs');
  await closeUp(album.empty, 'photos-removed', 0);
});

test('Experiences of a wrapped-up Popkin', async ({ page, pk }) => {
  const experiences = new ExperiencesPage(page);
  await open(page, pk, 'experiencesWrapped');
  await expect(experiences.titles).toHaveCount(4);
  await pictures(page);
  await shot(page, 'experiences-wrapped-xs');
});

test('an experience of a wrapped-up Popkin', async ({ page, pk }) => {
  const one = new ExperienceDetailPage(page);
  await open(page, pk, 'experienceDetailWrapped');
  await expect(one.title).toHaveText('Sunrise canoe to Heron Point');
  await expect(one.average).toBeVisible();
  await pictures(page);
  await shot(page, 'experience-wrapped-xs');
  await bringToTop(one.scoreCard, 24);
  await shot(page, 'experience-wrapped-score-xs');
});
