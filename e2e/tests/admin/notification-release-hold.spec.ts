// Acceptance Test
// Traces to: L2-172 AC4, AC7, L2-087 AC1, AC5
// Description: an Owner or Support admin releases a hold made by hand, with a reason; it leaves
// the list and the tab's count; a Viewer sees "Release" switched off.
import { signedInAs } from '../../fixtures/admin';
import { savesHolds, theMockHolds } from '../../fixtures/admin-notifications';
import { expect, test } from '../../fixtures/pk-test';
import { problem } from '../../fixtures/stubs';
import { AdminActionDialog } from '../../pages/admin/admin-dialogs';
import { NotificationsPage } from '../../pages/admin/notifications.page';

const RELEASE_REUNION = 'Release the hold on Class of 2015 Reunion?';

test.describe('Release a hold (L2-172)', () => {
  // Given a hold made by hand, when "Release" is chosen, then the dialog says members get email
  // again by their own settings and nothing held back is sent late, asks for a reason, and on
  // confirming the hold leaves the list (AC4).
  test('releases a hold with a reason', async ({ page, pk }) => {
    const mock = await theMockHolds(page);
    const writes = await savesHolds(page, mock);
    const view = new NotificationsPage(page);
    const dialog = new AdminActionDialog(page, RELEASE_REUNION, /^Release hold$/);
    await pk.open('adminNotificationsHolds');

    await view.hold('Class of 2015 Reunion').release.click();
    await expect(dialog.description).toHaveText(
      'Members here start getting email again, by their own settings, from the next change. Nothing held back is sent late.',
    );
    await expect(dialog.reason).toBeFocused();
    await dialog.reason.fill('Reports reviewed; invites were genuine');
    await dialog.confirm.click();

    await expect(dialog.dialog).toHaveCount(0);
    expect(writes).toEqual([
      {
        method: 'POST',
        path: '/api/admin/notifications/holds/hold-reunion/release',
        body: { reason: 'Reports reviewed; invites were genuine' },
      },
    ]);
    await expect(view.toast).toContainText('Hold released');
    await expect(view.hold('Class of 2015 Reunion').row).toHaveCount(0);
    await expect(view.holdRows).toHaveCount(3);
    await expect(view.tab('Holds')).toHaveAccessibleName('Holds 3');
  });

  // Given the dialog, when "Keep it held" is chosen, then nothing is sent and the hold stays.
  test('keeps the hold when the dialog is cancelled', async ({ page, pk }) => {
    const mock = await theMockHolds(page);
    const writes = await savesHolds(page, mock);
    const view = new NotificationsPage(page);
    const dialog = new AdminActionDialog(page, RELEASE_REUNION, /^Release hold$/);
    await pk.open('adminNotificationsHolds');

    await view.hold('Class of 2015 Reunion').release.click();
    await dialog.dialog.getByRole('button', { name: 'Keep it held' }).click();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(view.holdRows).toHaveCount(4);
    expect(writes).toEqual([]);
  });

  // Given the API refuses, when the admin confirms, then the dialog stays with the reason as
  // typed (L2-087 AC5).
  test('keeps the dialog when the release fails', async ({ page, pk }) => {
    await theMockHolds(page);
    await page.route('**/api/admin/notifications/holds/*/release', (route) => {
      const failed = problem(404, 'hold_not_found');
      return route.fulfill({ status: failed.status, json: failed.body });
    });
    const view = new NotificationsPage(page);
    const dialog = new AdminActionDialog(page, RELEASE_REUNION, /^Release hold$/);
    await pk.open('adminNotificationsHolds');

    await view.hold('Class of 2015 Reunion').release.click();
    await dialog.reason.fill('Reviewed');
    await dialog.confirm.click();

    await expect(dialog.alert).toContainText('That didn’t go through');
    await expect(dialog.reason).toHaveValue('Reviewed');
  });

  // Given a Viewer, when Holds shows, then "Release" is switched off with its reason and opens
  // nothing; Support may release (AC7).
  test('switches releasing off for a Viewer', async ({ page, pk }) => {
    await theMockHolds(page);
    await signedInAs(page, 'Viewer');
    const view = new NotificationsPage(page);
    await pk.open('adminNotificationsHolds');

    const release = view.hold('Class of 2015 Reunion').release;
    await expect(release).toHaveAttribute('aria-disabled', 'true');
    await expect(release).toHaveAttribute('title', 'Viewer admins can’t do this');
    await release.click({ force: true });
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('lets Support release a hold', async ({ page, pk }) => {
    await theMockHolds(page);
    await signedInAs(page, 'Support');
    const view = new NotificationsPage(page);
    const dialog = new AdminActionDialog(page, RELEASE_REUNION, /^Release hold$/);
    await pk.open('adminNotificationsHolds');

    await view.hold('Class of 2015 Reunion').release.click();
    await expect(dialog.panel).toBeVisible();
  });
});
