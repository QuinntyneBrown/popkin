// Acceptance Test
// Traces to: L2-172 AC1, AC5, AC6
// Description: an admin opens Holds and sees each Popkin and person held, why, by whom, since
// when and until when; automatic holds are marked and cannot be released; the tab ends with how
// accounts are held automatically and how many addresses the mail provider suppresses.
import { theMockHolds } from '../../fixtures/admin-notifications';
import { expect, test } from '../../fixtures/pk-test';
import { NotificationsPage } from '../../pages/admin/notifications.page';

test.describe('Holds (L2-172)', () => {
  // Given holds by hand and automatic ones, when an admin opens Holds, then "Held" says what a hold
  // does and lists each with its tile or photo, name and line, why, who and when, and until when,
  // manual holds first (AC1).
  test('lists every hold', async ({ page, pk }) => {
    await theMockHolds(page);
    const view = new NotificationsPage(page);
    await pk.open('adminNotificationsHolds');

    await expect(view.tab('Holds')).toHaveAttribute('aria-selected', 'true');
    await expect(view.heldSub).toHaveText(
      'No email or phone alerts go to these, whatever their own settings say. Members aren’t told.',
    );
    await expect(view.holdRows.locator('.who__name')).toHaveText([
      'Class of 2015 Reunion',
      'Priya Nair',
      'Ruth Lindqvist',
      'Grace Adeyemi',
    ]);
    const reunion = view.hold('Class of 2015 Reunion');
    await expect(reunion.line).toHaveText('Popkin · 46 members · GRAD-1507');
    await expect(reunion.why).toContainText('Reported for spam invites; 46 members, 3 reports');
    await expect(reunion.by).toHaveText('Aiko Tanaka · Sun 12 Jul');
    await expect(reunion.until).toHaveText('Until released');
    await expect(reunion.release).toBeVisible();
    await expect(view.hold('Priya Nair').line).toHaveText('priya.nair@fastmail.com');
  });

  // Given a suspended or deleting account, when Holds shows, then its hold is "Automatic", by
  // "System", until the suspension or the deletion ends, with no "Release" (AC5).
  test('marks automatic holds, which cannot be released here', async ({ page, pk }) => {
    await theMockHolds(page);
    const view = new NotificationsPage(page);
    await pk.open('adminNotificationsHolds');

    const ruth = view.hold('Ruth Lindqvist');
    await expect(ruth.automatic).toBeVisible();
    await expect(ruth.by).toHaveText('System · Mon 6 Jul');
    await expect(ruth.until).toHaveText('While suspended');
    await expect(ruth.row.getByRole('button')).toHaveCount(0);
    await expect(view.hold('Grace Adeyemi').until).toHaveText('Until deleted');
  });

  // Given Holds, when it shows, then it ends with the sentence about automatic holds and the
  // provider's count of suppressed addresses, or without the count until it is known (AC6).
  test('ends with how accounts are held automatically', async ({ page, pk }) => {
    await theMockHolds(page);
    const view = new NotificationsPage(page);
    await pk.open('adminNotificationsHolds');

    await expect(view.heldNote).toHaveText(
      'Suspended and deleting accounts are held automatically. 1,206 addresses that hard-bounced are suppressed by the mail provider and don’t appear here.',
    );
  });

  test('leaves the count out until the provider gives it', async ({ page, pk }) => {
    await theMockHolds(page, (h) => (h.suppressedAddresses = null));
    const view = new NotificationsPage(page);
    await pk.open('adminNotificationsHolds');

    await expect(view.heldNote).toHaveText(
      'Suspended and deleting accounts are held automatically. Addresses that hard-bounced are suppressed by the mail provider and don’t appear here.',
    );
  });

  // Given the Kinds tab, when the admin chooses "Holds", then the address keeps the tab.
  test('opens Holds from its tab', async ({ page, pk }) => {
    await theMockHolds(page);
    const view = new NotificationsPage(page);
    await pk.open('adminNotifications');

    await view.tab('Holds').click();
    await expect(page).toHaveURL(/\?tab=holds$/);
    await expect(view.hold('Class of 2015 Reunion').row).toBeVisible();
  });
});
