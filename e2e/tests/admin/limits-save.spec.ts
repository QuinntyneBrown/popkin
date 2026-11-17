// Acceptance Test
// Traces to: L2-176 AC5, AC8, L2-117 AC5, L2-087 AC1, AC2, AC5
// Description: an Owner saves a new sign-in length with a reason; the dialog lists the change,
// the save is sent with the reason, and a message confirms it.
import type { Page } from '@playwright/test';
import { atTheRecording } from '../../fixtures/admin';
import { savesLimits } from '../../fixtures/admin-limits';
import { problem } from '../../fixtures/stubs';
import { expect, test } from '../../fixtures/pk-test';
import { AdminActionDialog } from '../../pages/admin/admin-dialogs';
import { LimitsPage } from '../../pages/admin/limits.page';

const saveDialog = (page: Page) => new AdminActionDialog(page, 'Save new limits?', /^Save$/);

test.describe('Saving the sign-in length (L2-176)', () => {
  test.beforeEach(({ page }) => atTheRecording(page));

  // Given 30 days typed, when the Owner saves with a reason, then the dialog lists
  // "Sign-in lasts: 365 → 30 days", the change is sent with the reason, a toast confirms it and
  // nothing is left unsaved (AC5).
  test('saves the sign-in length with a reason', async ({ page, pk }) => {
    const writes = await savesLimits(page);
    const view = new LimitsPage(page);
    const dialog = saveDialog(page);
    await pk.open('adminLimits');

    await view.signInLasts.fill('30');
    await view.saveLimits.click();
    await expect(dialog.description).toHaveText('These apply to everyone within a minute:');
    await expect(dialog.dialog.locator('.change-list li')).toHaveText([
      'Sign-in lasts: 365 → 30 days',
    ]);
    await expect(dialog.reason).toBeFocused();
    await dialog.reason.fill('Shared tablets at the venue');
    await dialog.confirm.click();

    await expect(dialog.dialog).toHaveCount(0);
    expect(writes).toEqual([
      { changes: [{ limit: 'SessionDays', value: 30 }], reason: 'Shared tablets at the venue' },
    ]);
    await expect(view.toast).toContainText('Limits saved');
    await expect(view.toast).toContainText('Sign-in lasts changes for everyone within a minute.');
    await expect(view.saveBar).toHaveCount(0);
    await expect(view.signInLasts).toHaveValue('30');
  });

  // Given the reason is left empty, when the Owner saves, then nothing is sent (L2-087 AC2).
  test('asks for a reason before saving', async ({ page, pk }) => {
    const writes = await savesLimits(page);
    const view = new LimitsPage(page);
    const dialog = saveDialog(page);
    await pk.open('adminLimits');

    await view.signInLasts.fill('30');
    await view.saveLimits.click();
    await dialog.confirm.click();

    await expect(dialog.reasonField).toContainText('Give a reason; it goes in the audit log.');
    expect(writes).toEqual([]);
  });

  // Given the API refuses, when the Owner saves, then the dialog stays with the reason as typed
  // and the change stays unsaved (L2-087 AC5).
  test('keeps the dialog and the change when the save fails', async ({ page, pk }) => {
    await page.route('**/api/admin/limits', (route) => {
      if (route.request().method() !== 'PUT') return route.fallback();
      const failed = problem(503, 'unavailable');
      return route.fulfill({ status: failed.status, json: failed.body });
    });
    const view = new LimitsPage(page);
    const dialog = saveDialog(page);
    await pk.open('adminLimits');

    await view.signInLasts.fill('30');
    await view.saveLimits.click();
    await dialog.reason.fill('Shared tablets');
    await dialog.confirm.click();

    await expect(dialog.alert).toContainText('That didn’t go through');
    await expect(dialog.reason).toHaveValue('Shared tablets');
    await dialog.cancel.click();
    await expect(view.saveBarText).toHaveText('1 unsaved change');
    await expect(view.signInLasts).toHaveValue('30');
  });
});
