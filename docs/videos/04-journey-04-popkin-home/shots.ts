import type { Locator, Page } from '@playwright/test';
import { people, saturday } from '../../../e2e/fixtures/chat';
import { type Home, homeUrl, maraAtHome, openTheInvite } from '../../../e2e/fixtures/home';
import { mockToday } from '../../../e2e/fixtures/journeys';
import { test } from '../../../e2e/fixtures/pk-test';
import { InviteDialog } from '../../../e2e/pages/invite.dialog';
import { PopkinHomePage } from '../../../e2e/pages/popkin-home.page';
import { SIZES, detail, frame, shot, type Size } from '../../../tools/video-record/shots';

/**
 * The screenshots of video 04: journey 4, Popkin home, in the running app. Every /api request is
 * answered by the home stub of `e2e/fixtures/home.ts` or the recording, and the hub by
 * `e2e/fixtures/hub.ts` (ADR 0005, ADR 0010); no backend ran. Not a test and not a sweep: only
 * `node tools/video-record/record.mjs docs/videos/04-journey-04-popkin-home` runs it.
 */
const sizes = Object.keys(SIZES) as Size[];

/**
 * Mara, the Host, at the home of Lakeside Weekend on the mocks' Saturday (12 September 2026), at
 * twenty to noon on the device. The specs open the home half a minute before noon; the pictures
 * take longer than that, and the clock runs, so here it starts earlier and the time left stays
 * "1 day 6 hrs" for every shot.
 */
async function maraOnSaturday(page: Page, change?: (home: Home) => void): Promise<Home> {
  await page.clock.install({ time: new Date(mockToday.getTime() - 20 * 60_000) });
  return maraAtHome(page, change);
}

/** Opens the home and waits until its last section and its pictures are in. */
async function open(page: Page): Promise<PopkinHomePage> {
  const home = new PopkinHomePage(page);
  await page.goto(homeUrl);
  await home.memberRows.first().waitFor();
  await page.waitForLoadState('networkidle');
  return home;
}

/** Brings a region to the middle of the window, clear of the tabs. */
const centre = (region: Locator) =>
  region.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));

/** A close-up of a region from the middle of the window. */
async function closeUp(region: Locator, name: string, pad = 12): Promise<void> {
  await centre(region);
  await detail(region, name, pad);
}

test('the home at every form factor, and in the dark', async ({ page }) => {
  await maraOnSaturday(page);
  for (const size of sizes) {
    await frame(page, size);
    const home = await open(page);
    await shot(page, `home-${size.toLowerCase()}`);
    if (size === 'XS') {
      await detail(home.header, 'header', 0);
      await detail(home.identity, 'header-identity', 12);
      await detail(home.actions, 'header-actions', 12);
      await detail(home.nav, 'tabs', 0);
      await closeUp(home.chat, 'chat');
      await closeUp(home.photos, 'photos');
      await closeUp(home.experiences, 'experiences');
      await closeUp(home.members, 'members');
    }
    if (size === 'M') await detail(home.nav, 'rail', 0);
    if (size === 'L') await detail(home.nav, 'sidebar', 0);
    if (size === 'XL') {
      await closeUp(home.chat, 'chat-wide');
      await closeUp(home.experiences, 'experiences-wide');
      await closeUp(home.members, 'members-wide');
    }
  }
  await frame(page, 'XS', 'dark');
  await open(page);
  await shot(page, 'home-xs-dark');
  await frame(page, 'XL', 'dark');
  await open(page);
  await shot(page, 'home-xl-dark');
});

test('a message arrives while the home is open', async ({ page, hub }) => {
  const fixture = await maraOnSaturday(page);
  await frame(page, 'XS');
  const home = await open(page);

  await fixture.arrives(hub, people.walt, 'Kettle is on', saturday(11, 39));
  await home.chatLines.filter({ hasText: 'Kettle is on' }).waitFor();
  await home.newCount.filter({ hasText: '4' }).waitFor();
  await shot(page, 'live-xs');
  await detail(home.nav, 'tabs-live', 0);
  await closeUp(home.chat, 'chat-live');
});

test('a new Popkin', async ({ page }) => {
  await maraOnSaturday(page, (home) => home.justTheHost());
  await frame(page, 'XS');
  const home = await open(page);
  await shot(page, 'empty-xs');
  await closeUp(home.chat, 'empty-chat');
  await closeUp(home.photos, 'empty-photos');
  await shot(page, 'empty-photos-xs');
  await closeUp(home.experiences, 'empty-experiences');
  await shot(page, 'empty-experiences-xs');
});

test('one section fails, and "Try again"', async ({ page }) => {
  const fixture = await maraOnSaturday(page, (home) => home.fail('photos'));
  await frame(page, 'XS');
  const home = await open(page);
  await home.failureOf(home.photos).waitFor();
  await centre(home.photos);
  await shot(page, 'failed-xs');
  await closeUp(home.photos, 'failed-photos');

  fixture.recover('photos');
  await home.tryAgainIn(home.photos).click();
  await home.thumbnails.first().waitFor();
  await page.waitForLoadState('networkidle');
  await centre(home.photos);
  await shot(page, 'recovered-xs');
  await closeUp(home.photos, 'recovered-photos');
});

test('"Bring someone in"', async ({ page, context }) => {
  await maraOnSaturday(page);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const invite = new InviteDialog(page);

  await frame(page, 'XL');
  await open(page);
  await openTheInvite(page);
  await shot(page, 'invite-xl');

  await frame(page, 'XS');
  await open(page);
  await openTheInvite(page);
  await shot(page, 'invite-xs');
  await detail(invite.qrCard, 'invite-qr', 12);
  await detail(invite.copy, 'invite-copy', 12);

  await invite.copy.click();
  await invite.copy.filter({ hasText: 'Copied' }).waitFor();
  await shot(page, 'invite-copied-xs');
  await detail(invite.copy, 'invite-copied', 12);
});
