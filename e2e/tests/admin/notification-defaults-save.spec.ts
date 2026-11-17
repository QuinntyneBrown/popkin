// Acceptance Test
// Traces to: L2-173 AC4, L2-087 AC1, AC2, AC5
// Description: an Owner saves new defaults with a reason; the dialog lists each change, the save
// is sent with the reason, and the defaults become the new start, saying who changed them.
import type { Page } from '@playwright/test';
import { problem } from '../../fixtures/stubs';
import { savesDefaults, theMockDefaults } from '../../fixtures/admin-notifications';
import { expect, test } from '../../fixtures/pk-test';
import { AdminActionDialog } from '../../pages/admin/admin-dialogs';
import { NotificationsPage } from '../../pages/admin/notifications.page';

/** "Daily digest" and 20 minutes, as `defaults-edited.html` draws them. */
async function edit(view: NotificationsPage): Promise<void> {
  await view.activityEmail.getByRole('radio', { name: 'Daily digest' }).click();
  await view.bundle.fill('20');
}

const saveDialog = (page: Page) => new AdminActionDialog(page, 'Save new defaults?', /^Save$/);

test.describe('Saving the defaults (L2-173)', () => {
  // Given two unsaved changes, when the Owner saves with a reason, then the dialog lists both,
  // the defaults are sent with the reason, a toast says they're saved, and the foot says who
  // changed them (AC4).
  test('saves the defaults with a reason', async ({ page, pk }) => {
    const mock = await theMockDefaults(page);
    const writes = await savesDefaults(page, mock);
    const view = new NotificationsPage(page);
    const dialog = saveDialog(page);
    await pk.open('adminNotificationsDefaults');

    await edit(view);
    await view.saveDefaults.click();
    await expect(dialog.description).toHaveText(
      'These apply within a minute to every member who hasn’t chosen their own:',
    );
    await expect(dialog.dialog.locator('.change-list li')).toHaveText([
      'Activity email: As it happens → Daily digest',
      'Bundle changes within: 10 → 20 minutes',
    ]);
    await expect(dialog.reason).toBeFocused();
    await dialog.reason.fill('Fewer, fuller emails after member feedback');
    await dialog.confirm.click();

    await expect(dialog.dialog).toHaveCount(0);
    expect(writes).toEqual([
      {
        method: 'PUT',
        path: '/api/admin/notifications/defaults',
        body: {
          activityEmail: 'DailyDigest',
          bundleMinutes: 20,
          mostEmailsPerDay: 12,
          quietFrom: '21:00',
          quietTo: '08:00',
          birthdayLead: 'OneWeekBefore',
          reason: 'Fewer, fuller emails after member feedback',
        },
      },
    ]);
    await expect(view.toast).toContainText('Defaults saved');
    await expect(view.toast).toContainText(
      'They apply within a minute to members who haven’t chosen their own.',
    );
    await expect(view.saveBar).toHaveCount(0);
    await expect(view.defaultsFoot).toHaveText('Last changed today by Lena Fischer.');
    await expect(view.bundle).toHaveValue('20');
    await expect(view.saveDefaults).toBeDisabled();
  });

  // Given the reason is left empty, when the Owner saves, then nothing is sent (L2-087 AC2).
  test('asks for a reason before saving', async ({ page, pk }) => {
    const mock = await theMockDefaults(page);
    const writes = await savesDefaults(page, mock);
    const view = new NotificationsPage(page);
    const dialog = saveDialog(page);
    await pk.open('adminNotificationsDefaults');

    await edit(view);
    await view.saveDefaults.click();
    await dialog.confirm.click();

    await expect(dialog.reasonField).toContainText('Give a reason; it goes in the audit log.');
    expect(writes).toEqual([]);
  });

  // Given the API refuses, when the Owner saves, then the dialog stays with the reason as typed
  // and the changes stay unsaved (L2-087 AC5).
  test('keeps the dialog and the changes when the save fails', async ({ page, pk }) => {
    await theMockDefaults(page);
    await page.route('**/api/admin/notifications/defaults', (route) => {
      if (route.request().method() !== 'PUT') return route.fallback();
      const failed = problem(400, 'no_change');
      return route.fulfill({ status: failed.status, json: failed.body });
    });
    const view = new NotificationsPage(page);
    const dialog = saveDialog(page);
    await pk.open('adminNotificationsDefaults');

    await edit(view);
    await view.saveDefaults.click();
    await dialog.reason.fill('Fewer emails');
    await dialog.confirm.click();

    await expect(dialog.alert).toContainText('That didn’t go through');
    await expect(dialog.reason).toHaveValue('Fewer emails');
    await dialog.cancel.click();
    await expect(view.saveBarText).toHaveText('2 unsaved changes');
  });

  // Given the dialog, when the Owner cancels, then nothing is sent and the changes stay unsaved.
  test('keeps the changes unsaved when cancelled', async ({ page, pk }) => {
    const mock = await theMockDefaults(page);
    const writes = await savesDefaults(page, mock);
    const view = new NotificationsPage(page);
    const dialog = saveDialog(page);
    await pk.open('adminNotificationsDefaults');

    await edit(view);
    await view.saveDefaults.click();
    await dialog.cancel.click();

    await expect(dialog.dialog).toHaveCount(0);
    expect(writes).toEqual([]);
    await expect(view.saveBarText).toHaveText('2 unsaved changes');
    await expect(view.bundle).toHaveValue('20');
  });
});
