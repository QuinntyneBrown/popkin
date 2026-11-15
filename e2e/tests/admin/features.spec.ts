// Acceptance Test
// Traces to: L2-076 AC1–AC8, AC12, L2-087 AC3, AC5
// Description: an Owner sees who has Plan and Schedules, turns a feature off, on for everyone or
// on for chosen Popkins through a dialog with an optional reason, adds and removes chosen
// Popkins; a failure changes nothing and keeps the reason; a Support admin sees every switch
// switched off.
import type { Page } from '@playwright/test';
import { mockChosen, signedInAs, theMockFeatures, type MockFeature } from '../../fixtures/admin';
import { expect, test } from '../../fixtures/pk-test';
import { problem } from '../../fixtures/stubs';
import { AdminActionDialog } from '../../pages/admin/admin-dialogs';
import { AddFeaturePopkinDialog, FeaturesPage } from '../../pages/admin/features.page';

const schedulesOf = (features: MockFeature[]) => features.find((f) => f.feature === 'Schedules')!;

/** Answers a write to Schedules with the feature as `change` leaves it, recording the body. */
async function savesSchedules(
  page: Page,
  features: MockFeature[],
  method: string,
  change: (schedules: MockFeature, body: Record<string, unknown>) => void,
): Promise<Record<string, unknown>[]> {
  const bodies: Record<string, unknown>[] = [];
  await page.route('**/api/admin/features/Schedules**', (route) => {
    const request = route.request();
    if (request.method() !== method || request.url().includes('/search')) return route.fallback();
    const body = (request.postDataJSON() ?? {}) as Record<string, unknown>;
    bodies.push(body);
    const schedules = schedulesOf(features);
    change(schedules, body);
    return route.fulfill({ json: { ...schedules, changedAt: '2026-07-14T12:00:00+01:00' } });
  });
  return bodies;
}

test.describe('Features (L2-076)', () => {
  // Given the mocks' switches, when an Owner opens Features, then each feature says what it is,
  // how far it reaches and since when, its mode chosen, Schedules listing its Popkins (AC1, AC5).
  test('shows who has each feature', async ({ page, pk }) => {
    await theMockFeatures(page);
    const features = new FeaturesPage(page);
    await pk.open('adminFeatures');

    await expect(features.heading).toHaveText('Features');
    await expect(features.plan.reach).toContainText('On in all 3,112 live Popkins.');
    await expect(features.plan.since).toHaveText('On for everyone since 1 Jul by Lena Fischer');
    await expect(features.plan.mode('Everyone')).toHaveAttribute('aria-checked', 'true');
    await expect(features.plan.chosen).toHaveCount(0);
    await expect(features.schedules.reach).toContainText('On in 3 chosen Popkins only.');
    await expect(features.schedules.since).toHaveText(
      'Chosen Popkins since 14 Jul, 10:21 by Lena Fischer',
    );
    await expect(features.schedules.mode('Chosen Popkins')).toHaveAttribute('aria-checked', 'true');
    for (const [i, popkin] of mockChosen.entries()) {
      await expect(features.schedules.chips.nth(i)).toContainText(popkin.name);
    }
    await expect(features.shell.current).toHaveText('Features');
  });

  // Given Schedules on for chosen Popkins, when the Owner chooses Off and gives a reason, then the
  // dialog says what stays, the change is saved with the reason and the page says so (AC2, AC7).
  test('turns a feature off, with a reason for the log', async ({ page, pk }) => {
    const list = await theMockFeatures(page);
    const bodies = await savesSchedules(page, list, 'PUT', (schedules, body) => {
      schedules.mode = body['mode'] as MockFeature['mode'];
    });
    const features = new FeaturesPage(page);
    const dialog = new AdminActionDialog(page, 'Turn Schedules off for everyone?', /Turn it off/);
    await pk.open('adminFeatures');

    await features.schedules.mode('Off').click();
    await expect(dialog.description).toHaveText(
      'The Schedule tab disappears from every Popkin within a minute. Nothing is deleted: everyone’s time off and hours come back as they were when you turn it on again.',
    );
    await dialog.reason.fill('Sync bug on Android 3.4.0');
    await dialog.confirm.click();

    await expect(dialog.dialog).toHaveCount(0);
    await expect(features.toast).toContainText('Schedules is off');
    await expect(features.schedules.reach).toContainText('Hidden in every Popkin.');
    await expect(features.schedules.mode('Off')).toHaveAttribute('aria-checked', 'true');
    expect(bodies).toEqual([{ mode: 'Off', reason: 'Sync bug on Android 3.4.0' }]);
  });

  // Given the dialog open, when the Owner keeps the feature on, then nothing is saved and the
  // mode goes back to what it was (AC2).
  test('changes nothing when the Owner keeps it on', async ({ page, pk }) => {
    const list = await theMockFeatures(page);
    const bodies = await savesSchedules(page, list, 'PUT', () => undefined);
    const features = new FeaturesPage(page);
    const dialog = new AdminActionDialog(page, 'Turn Schedules off for everyone?', /Turn it off/);
    await pk.open('adminFeatures');

    await features.schedules.mode('Off').click();
    await dialog.dialog.getByRole('button', { name: 'Keep it on' }).click();

    await expect(dialog.dialog).toHaveCount(0);
    await expect(features.schedules.mode('Chosen Popkins')).toHaveAttribute('aria-checked', 'true');
    expect(bodies).toEqual([]);
  });

  // Given Plan on for everyone, when the Owner limits it to chosen Popkins, then the dialog says
  // no Popkin is chosen yet (AC4).
  test('limits a feature to chosen Popkins', async ({ page, pk }) => {
    await theMockFeatures(page);
    const features = new FeaturesPage(page);
    const dialog = new AdminActionDialog(page, 'Limit Plan to chosen Popkins?', /Apply/);
    await pk.open('adminFeatures');

    await features.plan.mode('Chosen Popkins').click();

    await expect(dialog.description).toHaveText(
      'No Popkin is chosen yet, so Plan is on in no Popkin until you add one. Everyone else stops seeing the Plan tab within a minute; nothing is deleted.',
    );
  });

  // Given the API fails, when the Owner confirms, then the dialog stays open saying nothing has
  // changed, with the reason as typed (AC8, L2-087 AC5).
  test('keeps the dialog and the reason when a change fails', async ({ page, pk }) => {
    await theMockFeatures(page);
    await page.route('**/api/admin/features/Schedules', (route) => {
      const failed = problem(500, 'server_error');
      return route.request().method() === 'PUT'
        ? route.fulfill({ status: failed.status, json: failed.body })
        : route.fallback();
    });
    const features = new FeaturesPage(page);
    const dialog = new AdminActionDialog(page, 'Turn Schedules on for everyone?', /Apply/);
    await pk.open('adminFeatures');

    await features.schedules.mode('Everyone').click();
    await dialog.reason.fill('Rolling out');
    await dialog.confirm.click();

    await expect(dialog.alert).toContainText('That didn’t go through');
    await expect(dialog.alert).toContainText(
      'Nothing has changed. Your reason is kept; try again.',
    );
    await expect(dialog.reason).toHaveValue('Rolling out');
  });

  // Given Schedules on for chosen Popkins, when the Owner searches, picks a live Popkin and adds
  // it, then it joins the chosen Popkins (AC6).
  test('adds a Popkin to a feature', async ({ page, pk }) => {
    const list = await theMockFeatures(page);
    const hornets = {
      popkinId: 'mock-u10',
      name: 'U10 Hornets Parents',
      emoji: '🐝',
      colour: 'Amber',
    };
    await page.route('**/api/admin/features/Schedules/popkins/search**', (route) =>
      route.fulfill({
        json: [
          { ...hornets, inviteCode: 'HRNT-3301', alreadyOn: false },
          { ...mockChosen[0], alreadyOn: true },
        ],
      }),
    );
    const bodies = await savesSchedules(page, list, 'POST', (schedules) => {
      schedules.chosen = [...schedules.chosen, hornets];
    });
    const features = new FeaturesPage(page);
    const dialog = new AddFeaturePopkinDialog(page, 'Schedules');
    await pk.open('adminFeatures');

    await features.schedules.addPopkin.click();
    await expect(dialog.description).toHaveText(
      'Only live Popkins can be added. It gets the Schedule tab within a minute.',
    );
    await dialog.search.fill('h');
    await expect(dialog.notes).toHaveText(['Lakeside Weekend already has Schedules.']);
    await dialog.option('U10 Hornets Parents').click();
    await dialog.add.click();

    await expect(dialog.dialog).toHaveCount(0);
    await expect(features.toast).toContainText('U10 Hornets Parents has Schedules');
    await expect(features.schedules.chips).toHaveCount(4);
    expect(bodies).toEqual([{ popkinId: 'mock-u10', reason: null }]);
  });

  // Given a chosen Popkin, when the Owner removes it, then it goes without a question (AC6).
  test('removes a chosen Popkin', async ({ page, pk }) => {
    const list = await theMockFeatures(page);
    await savesSchedules(page, list, 'DELETE', (schedules) => {
      schedules.chosen = schedules.chosen.filter((p) => p.name !== 'Sunday Brunch Club');
    });
    const features = new FeaturesPage(page);
    await pk.open('adminFeatures');

    await features.schedules.remove('Sunday Brunch Club').click();

    await expect(features.schedules.chips).toHaveCount(2);
    await expect(features.schedules.remove('Sunday Brunch Club')).toHaveCount(0);
    await expect(features.toast).toContainText('Sunday Brunch Club no longer has Schedules');
  });

  // Given a Support admin, then every switch is there but switched off, saying why (AC12).
  test('shows a Support admin the switches, switched off', async ({ page, pk }) => {
    await theMockFeatures(page);
    await signedInAs(page, 'Support');
    const features = new FeaturesPage(page);
    const dialog = page.getByRole('dialog');
    await pk.open('adminFeatures');

    const off = features.schedules.mode('Off');
    await expect(off).toHaveAttribute('aria-disabled', 'true');
    await expect(off).toHaveAttribute('title', 'Only Owners can do this');
    await off.click({ force: true });
    await expect(dialog).toHaveCount(0);
    await expect(features.schedules.mode('Chosen Popkins')).toHaveAttribute('aria-checked', 'true');
    await expect(features.schedules.remove('Lakeside Weekend')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await features.schedules.addPopkin.click({ force: true });
    await expect(dialog).toHaveCount(0);
  });

  // Given the API fails, then the page says so and tries again (AC1).
  test('says when the features could not be read', async ({ page, pk }) => {
    await page.route('**/api/admin/features', (route) => {
      const failed = problem(500, 'server_error');
      return route.fulfill({ status: failed.status, json: failed.body });
    });
    const features = new FeaturesPage(page);
    await pk.open('adminFeatures');

    await expect(page.getByRole('heading', { name: 'Couldn’t load the features' })).toBeVisible();
    await page.unroute('**/api/admin/features');
    await theMockFeatures(page);
    await features.tryAgain.click();
    await expect(features.schedules.chips).toHaveCount(3);
  });
});
