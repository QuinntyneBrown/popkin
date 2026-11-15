import { popkinId } from '../fixtures/chat';
import { homeNow, homeUrl, maraAtHome, type Home } from '../fixtures/home';
import { expect, test } from '../fixtures/pk-test';
import { answer, hold, problem } from '../fixtures/stubs';
import { PopkinFeaturesDialog } from '../pages/popkin-features.dialog';
import { PopkinHomePage } from '../pages/popkin-home.page';
import { PopkinSettingsDialog } from '../pages/popkin-settings.dialog';
import { Toasts } from '../pages/toasts';
import type { Page } from '@playwright/test';

const features = `/api/popkins/${popkinId}/features`;

/** Mara at the home of Lakeside Weekend, offered Plan (on) and Schedules (off). */
async function maraOffered(page: Page, change?: (home: Home) => void): Promise<Home> {
  await page.clock.install({ time: homeNow });
  // The home reads the Plan's summary while Plan is on: no story yet.
  await answer(page, `GET /api/popkins/${popkinId}/plan/summary`, { status: 200, body: null });
  const home = await maraAtHome(page, (h) => {
    h.offers([
      { feature: 'Plan', on: true },
      { feature: 'Schedules', on: false },
    ]);
    change?.(h);
  });
  await page.goto(homeUrl);
  return home;
}

async function openFeatures(page: Page): Promise<PopkinFeaturesDialog> {
  await new PopkinHomePage(page).settings.click();
  await new PopkinSettingsDialog(page).features.click();
  const dialog = new PopkinFeaturesDialog(page);
  await expect(dialog.panel).toBeVisible();
  return dialog;
}

/** Answers the Host's save with what the API would: the new switches and choices. */
async function saves(page: Page, asked: unknown[] = []): Promise<unknown[]> {
  await page.route(`**${features}`, async (route) => {
    if (route.request().method() !== 'PUT') return route.fallback();
    const body = route.request().postDataJSON() as { plan: boolean; schedules: boolean };
    asked.push(body);
    await route.fulfill({
      json: {
        plan: body.plan,
        schedules: body.schedules,
        choices: [
          { feature: 'Plan', on: body.plan },
          { feature: 'Schedules', on: body.schedules },
        ],
      },
    });
  });
  return asked;
}

test.describe('Features in Popkin settings', () => {
  // L2-153 AC1
  test('the Host is offered Features, with what is on as its hint', async ({ page }) => {
    await maraOffered(page);

    await new PopkinHomePage(page).settings.click();

    const settings = new PopkinSettingsDialog(page);
    await expect(settings.items).toHaveText([
      /Edit name and look/,
      /Change how long it lasts/,
      /Features/,
      /Invite people/,
      /Wrap up/,
    ]);
    await expect(settings.features).toContainText('Plan');
  });

  // L2-153 AC1
  test('with everything switched off the hint reads All off', async ({ page }) => {
    await maraOffered(page, (home) =>
      home.offers([
        { feature: 'Plan', on: false },
        { feature: 'Schedules', on: false },
      ]),
    );

    await new PopkinHomePage(page).settings.click();

    await expect(new PopkinSettingsDialog(page).features).toContainText('All off');
  });

  // L2-153 AC1
  test('a member who is not the Host is not offered Features', async ({ page }) => {
    await maraOffered(page, (home) => {
      home.popkin.viewerRole = 'Member';
    });

    await new PopkinHomePage(page).settings.click();

    const settings = new PopkinSettingsDialog(page);
    await expect(settings.leave).toBeVisible();
    await expect(settings.features).toHaveCount(0);
  });

  // L2-153 AC2
  test('Features lists each offered feature as a switch in the Host’s choice', async ({ page }) => {
    await maraOffered(page);

    const dialog = await openFeatures(page);

    await expect(dialog.heading).toHaveText('Features');
    await expect(dialog.switches).toHaveCount(2);
    await expect(dialog.row('Plan')).toContainText(
      'A board of stories to share out the jobs, and a burn-down of what’s left.',
    );
    await expect(dialog.row('Schedules')).toContainText(
      'Everyone’s time off and hours, and the days of the event.',
    );
    await expect(dialog.feature('Plan')).toHaveAttribute('aria-checked', 'true');
    await expect(dialog.feature('Schedules')).toHaveAttribute('aria-checked', 'false');
    await expect(dialog.save).toHaveText('Save');
    await expect(dialog.cancel).toBeVisible();
  });

  // L2-153 AC3
  test('Save sends the switches, closes, says so, and the tabs change at once', async ({
    page,
  }) => {
    const asked = await saves(page);
    await maraOffered(page);
    const home = new PopkinHomePage(page);
    await expect(home.planTab).toBeVisible();
    const dialog = await openFeatures(page);

    await dialog.feature('Plan').click();
    await dialog.save.click();

    await expect(dialog.root).toHaveCount(0);
    expect(asked).toEqual([{ plan: false, schedules: false }]);
    await expect(new Toasts(page).toast).toContainText('Features saved');
    await expect(home.planTab).toHaveCount(0);
    await expect(home.scheduleTab).toHaveCount(0);
  });

  // L2-153 AC3
  test('Save reads Saving… and is disabled until it is saved', async ({ page }) => {
    await saves(page);
    const release = await hold(page, `PUT ${features}`);
    await maraOffered(page);
    const dialog = await openFeatures(page);
    await dialog.feature('Plan').click();

    await dialog.save.click();

    await expect(dialog.save).toHaveText('Saving…');
    await expect(dialog.save).toBeDisabled();
    await expect(dialog.feature('Plan')).toBeDisabled();
    release();
    await expect(dialog.root).toHaveCount(0);
  });

  // L2-153 AC6
  test('a save that fails keeps the dialog open with the switches as the Host left them', async ({
    page,
  }) => {
    await answer(page, `PUT ${features}`, problem(500, 'server_error'));
    await maraOffered(page);
    const dialog = await openFeatures(page);
    await dialog.feature('Schedules').click();

    await dialog.save.click();

    await expect(dialog.alert).toContainText('We couldn’t save your changes.');
    await expect(dialog.alert).toContainText('Try again.');
    await expect(dialog.feature('Plan')).toHaveAttribute('aria-checked', 'true');
    await expect(dialog.feature('Schedules')).toHaveAttribute('aria-checked', 'true');
    await expect(dialog.save).toBeEnabled();
    await dialog.cancel.click();
    await expect(new PopkinHomePage(page).planTab).toBeVisible();
  });

  test('Cancel closes it and sends nothing', async ({ page }) => {
    const asked = await saves(page);
    await maraOffered(page);
    const dialog = await openFeatures(page);
    await dialog.feature('Plan').click();

    await dialog.cancel.click();

    await expect(dialog.root).toHaveCount(0);
    expect(asked).toEqual([]);
    await expect(new PopkinHomePage(page).planTab).toBeVisible();
  });
});
