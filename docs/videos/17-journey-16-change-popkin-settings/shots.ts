import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { type Home, homeNow, homeUrl, maraAtHome } from '../../../e2e/fixtures/home';
import type { Hub } from '../../../e2e/fixtures/hub';
import { test } from '../../../e2e/fixtures/pk-test';
import { type Settings, maraWithSettings } from '../../../e2e/fixtures/settings';
import { openChangeLength, openEditPopkin } from '../../../e2e/fixtures/settings-states';
import { ChangeLengthDialog } from '../../../e2e/pages/change-length.dialog';
import { EndDateDialog } from '../../../e2e/pages/end-date.dialog';
import { PopkinHomePage } from '../../../e2e/pages/popkin-home.page';
import { PopkinSettingsDialog } from '../../../e2e/pages/popkin-settings.dialog';
import { WrapUpBanner } from '../../../e2e/pages/wrap-up-banner';
import { detail, frame, shot, type Size, type Theme } from '../../../tools/video-record/shots';

/**
 * The screenshots of video 17: journey 16, Change Popkin settings, in the running app. Mara, the
 * Host of Lakeside Weekend, opens Popkin settings on its home, on the day of the fixtures
 * (`homeNow`), with the settings answered by `e2e/fixtures/settings.ts`; a member's home is told
 * of the change through the stubbed hub. Every /api request is answered in memory by the
 * fixtures of `e2e/` (ADR 0005); no backend and no database ran. Not a test and not a sweep: only
 * `node tools/video-record/record.mjs docs/videos/17-journey-16-change-popkin-settings` runs it.
 */

const lower = (size: Size) => size.toLowerCase();
const SIZES = ['XS', 'M', 'L', 'XL'] as const satisfies readonly Size[];
const longWeekend = { name: 'Lakeside Long Weekend', emoji: '🎉', colour: 'Plum' };
const monday = new Date(2026, 8, 14, 18, 0);
const asMember = (home: Home) => {
  home.popkin = { ...home.popkin, viewerRole: 'Member' };
};

/** Waits until every picture on the page has arrived. */
async function pictures(page: Page): Promise<void> {
  await page.evaluate(() =>
    Promise.all(
      [...document.images].map((image) => image.complete || image.decode().catch(() => undefined)),
    ),
  );
}

/** Mara at the home, at a size and a theme. */
async function homeAt(page: Page, size: Size, theme: Theme = 'light', change?: (home: Home) => void) {
  await page.clock.install({ time: homeNow });
  await frame(page, size, theme);
  const settings = await maraWithSettings(page, change);
  await page.goto(homeUrl);
  const home = new PopkinHomePage(page);
  await expect(home.heading).toHaveText('Lakeside Weekend');
  await pictures(page);
  return { settings, home };
}

/** The home reads itself again once the hub connects; a change pushed after that is the event's. */
async function caughtUp(settings: Settings, hub: Hub): Promise<void> {
  await hub.connected();
  await expect.poll(() => settings.home.asked.popkin).toBeGreaterThanOrEqual(2);
}

for (const theme of ['light', 'dark'] as const) {
  test(`the Host's menu, ${theme}`, async ({ page }) => {
    const { home } = await homeAt(page, 'XS', theme);
    await home.settings.click();
    const menu = new PopkinSettingsDialog(page);
    await expect(menu.items).toHaveCount(4);
    await page.mouse.move(0, 0);
    await shot(page, `menu-xs${theme === 'dark' ? '-dark' : ''}`);
    if (theme === 'light') await detail(menu.panel, 'menu', 0);
  });
}

test('Mara edits the name and the look', async ({ page }) => {
  const { home } = await homeAt(page, 'XS');
  await detail(home.header, 'header-before', 0);
  const edit = await openEditPopkin(page);
  await shot(page, 'edit-xs');
  await edit.name.fill(longWeekend.name);
  await edit.emojiNamed('Party popper').click();
  await edit.colourNamed('Plum').click();
  await edit.name.blur();
  await page.mouse.move(0, 0);
  await detail(edit.panel, 'edit-filled', 0);
  await edit.save.click();
  await expect(edit.root).toHaveCount(0);
  await expect(home.heading).toHaveText(longWeekend.name);
  await page.mouse.move(0, 0);
  await shot(page, 'home-renamed-xs');
  await detail(home.header, 'header-after', 0);
});

test('an empty name is marked, and nothing is sent', async ({ page }) => {
  await homeAt(page, 'XS');
  const edit = await openEditPopkin(page);
  await edit.name.fill('');
  await expect(edit.nameError).toHaveText('Give your Popkin a name.');
  await detail(edit.panel, 'edit-invalid', 0);
});

test('Mara changes how long it lasts', async ({ page }) => {
  const { home } = await homeAt(page, 'XS');
  await detail(home.timeLeft, 'time-before', 12);
  const dialog = await openChangeLength(page);
  await page.mouse.move(0, 0);
  await shot(page, 'length-xs');
  await detail(dialog.panel, 'length-panel', 0);
  await dialog.option('Until a date').click();
  await dialog.endDate.click();
  const end = new EndDateDialog(page);
  await end.day.fill('2026-09-14');
  await end.time.fill('18:00');
  await end.setTheEnd.click();
  await expect(dialog.endDate).toHaveText('Ends Mon, 14 Sep · 6:00 pm');
  await page.mouse.move(0, 0);
  await detail(dialog.panel, 'length-date', 0);
  await dialog.save.click();
  await expect(dialog.root).toHaveCount(0);
  await expect(home.timeLeft).toHaveText('2 days 6 hrs left · Wraps up Mon, 6 pm');
  await detail(home.timeLeft, 'time-after', 12);
});

test('a member sees the change without a reload', async ({ page, hub }) => {
  const { settings, home } = await homeAt(page, 'XL', 'light', asMember);
  await caughtUp(settings, hub);
  await page.mouse.move(0, 0);
  await shot(page, 'member-before-xl');
  await settings.changedElsewhere(hub, {
    ...longWeekend,
    length: 'UntilDate',
    endsAt: monday.toISOString(),
  });
  await expect(home.heading).toHaveText(longWeekend.name);
  await expect(home.timeLeft).toHaveText('2 days 6 hrs left · Wraps up Mon, 6 pm');
  await pictures(page);
  await shot(page, 'member-after-xl');
});

test('the last hour: the Host’s "Change"', async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 8, 13, 17, 17, 30) });
  await frame(page, 'XS');
  await maraAtHome(page);
  await page.goto(homeUrl);
  const banner = new WrapUpBanner(page);
  await expect(banner.action).toHaveAccessibleName('Change how long it lasts');
  await pictures(page);
  await shot(page, 'banner-xs');
  await detail(banner.root, 'banner', 0);
  await banner.action.click();
  await expect(new ChangeLengthDialog(page).heading).toBeVisible();
  await page.mouse.move(0, 0);
  await shot(page, 'banner-length-xs');
});

for (const size of SIZES) {
  test(`Edit name and look at ${size}`, async ({ page }) => {
    await homeAt(page, size);
    await openEditPopkin(page);
    await page.mouse.move(0, 0);
    await shot(page, `edit-${lower(size)}`);
  });
}
