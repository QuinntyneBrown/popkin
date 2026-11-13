import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { homeOf, theMockHome } from '../../../e2e/fixtures/home';
import { leaveStates } from '../../../e2e/fixtures/leave-states';
import { openLeave } from '../../../e2e/fixtures/leaving';
import { type Pk, test } from '../../../e2e/fixtures/pk-test';
import type { RouteKey } from '../../../e2e/fixtures/routes';
import { wrapUpStates } from '../../../e2e/fixtures/wrap-up-states';
import { LeavePopkinDialog } from '../../../e2e/pages/leave-popkin.dialog';
import { MyPopkinsPage } from '../../../e2e/pages/my-popkins.page';
import { PopkinHomePage } from '../../../e2e/pages/popkin-home.page';
import { PopkinSettingsDialog } from '../../../e2e/pages/popkin-settings.dialog';
import { detail, frame, shot, type Size, type Theme } from '../../../tools/video-record/shots';

/**
 * The screenshots of video 11: journey 18, Leave a Popkin, in the running app. Each state is
 * opened by its key in `e2e/fixtures/routes.ts` with the step before it from
 * `e2e/fixtures/leave-states.ts` or `wrap-up-states.ts`, as the sweeps open it; Mara is a member
 * who is not the Host, except where the Host's own menu and home are shown. Every /api request
 * is answered in memory by the fixtures of `e2e/` or the recording, and the hub is stubbed
 * (ADR 0005, ADR 0010); no backend and no database ran. Not a test and not a sweep: only
 * `node tools/video-record/record.mjs docs/videos/11-journey-18-leave-a-popkin` runs it.
 */

const lower = (size: Size) => size.toLowerCase();

/** Waits until every picture on the page has arrived. */
async function pictures(page: Page): Promise<void> {
  await page.evaluate(() =>
    Promise.all(
      [...document.images].map((image) => image.complete || image.decode().catch(() => undefined)),
    ),
  );
}

interface State {
  before: (page: Page) => Promise<void>;
  app?: (page: Page) => Promise<void>;
}

/** Opens a state by its key, at a size and a theme, as the sweeps do. */
async function open(page: Page, pk: Pk, key: RouteKey, state: State, size: Size, theme: Theme = 'light') {
  await frame(page, size, theme);
  await state.before(page);
  await pk.open(key);
  await expect(new PopkinHomePage(page).settings).toBeVisible();
  await state.app?.(page);
  await pictures(page);
}

test('the member at home, in the dark theme', async ({ page, pk }) => {
  await open(page, pk, 'popkinSettingsMember', wrapUpStates.popkinSettingsMember, 'XS', 'dark');
  await page.keyboard.press('Escape');
  await expect(new PopkinSettingsDialog(page).root).toHaveCount(0);
  await shot(page, 'home-member-xs-dark');
});

test("the member's menu, and the Host's", async ({ page, pk }) => {
  await open(page, pk, 'popkinSettingsMember', wrapUpStates.popkinSettingsMember, 'XS');
  const settings = new PopkinSettingsDialog(page);
  await shot(page, 'settings-member-xs');
  await detail(settings.menu, 'settings-member-menu', 12);
  await detail(settings.leave, 'settings-leave', 12);

  await open(page, pk, 'popkinSettings', wrapUpStates.popkinSettings, 'XS');
  await shot(page, 'settings-host-xs');
  await detail(new PopkinSettingsDialog(page).menu, 'settings-host-menu', 12);
});

for (const size of ['XS', 'XL'] as const) {
  test(`the question at ${size}`, async ({ page, pk }) => {
    await open(page, pk, 'leavePopkin', leaveStates.leavePopkin, size);
    const dialog = new LeavePopkinDialog(page);
    await dialog.stay.focus();
    await shot(page, `leave-${lower(size)}`);
    if (size === 'XS') {
      await detail(dialog.heading, 'leave-heading', 12);
      await detail(dialog.description, 'leave-description', 12);
      await detail(dialog.footer, 'leave-actions', 8);
    }
  });
}

test('leaving, and leaving that failed', async ({ page, pk }) => {
  await open(page, pk, 'leavePopkinBusy', leaveStates.leavePopkinBusy, 'XS');
  await detail(new LeavePopkinDialog(page).footer, 'leave-busy', 8);
  await open(page, pk, 'leavePopkinFailed', leaveStates.leavePopkinFailed, 'XS');
  const failed = new LeavePopkinDialog(page);
  await failed.leave.blur();
  await detail(failed.failed, 'leave-failed', 8);
});

for (const size of ['XS', 'M', 'L', 'XL'] as const) {
  test(`My Popkins without Lakeside Weekend at ${size}`, async ({ page, pk }) => {
    await open(page, pk, 'leavePopkin', leaveStates.leavePopkin, size);
    await openLeaveIfClosed(page);
    await new LeavePopkinDialog(page).leave.click();
    const popkins = new MyPopkinsPage(page);
    await expect(popkins.root).toBeVisible();
    await expect(popkins.cardNames).toHaveText(['Thursday Night Group', 'Tigers U9 Parents']);
    await pictures(page);
    await shot(page, `gone-${lower(size)}`);
  });
}

async function openLeaveIfClosed(page: Page): Promise<void> {
  if ((await new LeavePopkinDialog(page).root.count()) === 0) await openLeave(page);
}

test('the Host counts one member fewer', async ({ page, pk, hub }) => {
  await frame(page, 'XS');
  await theMockHome(page);
  await pk.open('popkinHome');
  const home = new PopkinHomePage(page);
  await expect(home.memberCount).toHaveText('14 members');
  await hub.connected();
  await pictures(page);
  await shot(page, 'host-before-xs');
  await detail(home.memberCount, 'count-before', 12);

  await homeOf(page).leaves(hub, 'Joel');

  await expect(home.memberCount).toHaveText('13 members');
  await shot(page, 'host-after-xs');
  await detail(home.memberCount, 'count-after', 12);
});
