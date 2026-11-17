import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import {
  mockChosen,
  signedInAs,
  theMockFeatures,
  type MockFeature,
} from '../../../e2e/fixtures/admin';
import { type Pk, test } from '../../../e2e/fixtures/pk-test';
import { AdminActionDialog } from '../../../e2e/pages/admin/admin-dialogs';
import { AddFeaturePopkinDialog, FeaturesPage } from '../../../e2e/pages/admin/features.page';
import { detail, frame, shot, type Size, type Theme } from '../../../tools/video-record/shots';

/**
 * The screenshots of video 25: journey 23, Switch a feature, in the running admin app on :4202.
 * Lena Fischer, an Owner, switches Plan and Schedules on the mocks' 14 July. Every /api request
 * is answered in memory by the fixtures of `e2e/` (ADR 0005); no backend and no database ran.
 * Not a test and not a sweep: only
 * `node tools/video-record/record.mjs docs/videos/25-journey-23-switch-a-feature` runs it.
 */


const hornets = {
  popkinId: 'mock-u10',
  name: 'U10 Hornets Parents',
  emoji: '🐝',
  colour: 'Amber',
};

/** Answers a write to Schedules with the feature as `change` leaves it. */
async function savesSchedules(
  page: Page,
  features: MockFeature[],
  method: string,
  change: (schedules: MockFeature, body: Record<string, unknown>) => void,
): Promise<void> {
  await page.route('**/api/admin/features/Schedules**', (route) => {
    const request = route.request();
    if (request.method() !== method || request.url().includes('/search')) return route.fallback();
    const schedules = features.find((f) => f.feature === 'Schedules')!;
    change(schedules, (request.postDataJSON() ?? {}) as Record<string, unknown>);
    return route.fulfill({ json: { ...schedules, changedAt: '2026-07-14T12:00:00+01:00' } });
  });
}

async function open(page: Page, pk: Pk, size: Size, theme: Theme = 'light') {
  await frame(page, size, theme);
  const features = await theMockFeatures(page);
  await pk.open('adminFeatures');
  await expect(new FeaturesPage(page).schedules.chips).toHaveCount(3);
  return features;
}

const blur = (page: Page) =>
  page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

for (const size of ['XS', 'M', 'L', 'XL'] as const) {
  test(`Features at ${size}`, async ({ page, pk }) => {
    await open(page, pk, size);
    await shot(page, `features-${size.toLowerCase()}`);
    if (size === 'XL') {
      const features = new FeaturesPage(page);
      await detail(features.planPanel, 'plan', 12);
      await detail(features.schedulesPanel, 'schedules', 12);
    }
  });
}

test('Features in the dark', async ({ page, pk }) => {
  await open(page, pk, 'XL', 'dark');
  await shot(page, 'features-xl-dark');
});

test('turning Schedules off, with a reason', async ({ page, pk }) => {
  const list = await open(page, pk, 'XL');
  await savesSchedules(page, list, 'PUT', (schedules, body) => {
    schedules.mode = body['mode'] as MockFeature['mode'];
    schedules.chosen = [];
  });
  const features = new FeaturesPage(page);
  const dialog = new AdminActionDialog(page, 'Turn Schedules off for everyone?', /Turn it off/);
  await features.schedules.mode('Off').click();
  await dialog.reason.fill('Sync bug on Android 3.4.0');
  await blur(page);
  await shot(page, 'off-dialog-xl');
  await detail(dialog.panel, 'off-dialog', 12);
  await dialog.confirm.click();
  await expect(features.toast).toContainText('Schedules is off');
  await shot(page, 'off-xl');
  await detail(features.schedulesPanel, 'schedules-off', 12);
  await detail(features.toast, 'off-toast', 12);
});

test('turning Schedules on for everyone', async ({ page, pk }) => {
  await open(page, pk, 'XL');
  const features = new FeaturesPage(page);
  const dialog = new AdminActionDialog(page, 'Turn Schedules on for everyone?', /Apply/);
  await features.schedules.mode('Everyone').click();
  await dialog.reason.fill('Rolling out');
  await blur(page);
  await detail(dialog.panel, 'everyone-dialog', 12);
});

test('adding a chosen Popkin', async ({ page, pk }) => {
  const list = await open(page, pk, 'XL');
  await page.route('**/api/admin/features/Schedules/popkins/search**', (route) =>
    route.fulfill({
      json: [
        { ...hornets, inviteCode: 'HRNT-3301', alreadyOn: false },
        { ...mockChosen[0], alreadyOn: true },
      ],
    }),
  );
  await savesSchedules(page, list, 'POST', (schedules) => {
    schedules.chosen = [...schedules.chosen, hornets];
  });
  const features = new FeaturesPage(page);
  const dialog = new AddFeaturePopkinDialog(page, 'Schedules');
  await features.schedules.addPopkin.click();
  await dialog.search.fill('h');
  await expect(dialog.notes).toHaveText(['Lakeside Weekend already has Schedules.']);
  await dialog.option('U10 Hornets Parents').click();
  await blur(page);
  await shot(page, 'add-popkin-xl');
  await detail(dialog.panel, 'add-popkin', 12);
  await dialog.add.click();
  await expect(features.schedules.chips).toHaveCount(4);
  await detail(features.schedulesPanel, 'schedules-four', 12);
});

test('a Support admin', async ({ page, pk }) => {
  await frame(page, 'XL');
  await theMockFeatures(page);
  await signedInAs(page, 'Support');
  await pk.open('adminFeatures');
  await expect(new FeaturesPage(page).schedules.chips).toHaveCount(3);
  await shot(page, 'support-xl');
  await detail(new FeaturesPage(page).schedulesPanel, 'support-schedules', 12);
});
