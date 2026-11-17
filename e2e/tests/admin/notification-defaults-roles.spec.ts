// Acceptance Test
// Traces to: L2-173 AC5, L2-086
// Description: Support and Viewer admins see the defaults but cannot change them: every field is
// read-only and "Save defaults" is switched off with the reason.
import { signedInAs } from '../../fixtures/admin';
import { theMockDefaults } from '../../fixtures/admin-notifications';
import { expect, test } from '../../fixtures/pk-test';
import { NotificationsPage } from '../../pages/admin/notifications.page';

test.describe('Defaults for Support and Viewer (L2-173 AC5)', () => {
  for (const [role, reason] of [
    ['Support', 'Only Owners can do this'],
    ['Viewer', 'Viewer admins can’t do this'],
  ] as const) {
    // Given a Support or Viewer admin, when Defaults shows, then each field reads its value but
    // takes no change, and "Save defaults" is off with the reason.
    test(`shows the defaults read-only to ${role}`, async ({ page, pk }) => {
      await theMockDefaults(page);
      await signedInAs(page, role);
      const view = new NotificationsPage(page);
      await pk.open('adminNotificationsDefaults');

      await expect(view.bundle).toHaveValue('10');
      for (const field of [view.bundle, view.mostEmails, view.quietFrom, view.quietTo]) {
        await expect(field).not.toBeEditable();
      }
      await expect(view.birthdayLead).toBeDisabled();
      const daily = view.activityEmail.getByRole('radio', { name: 'Daily digest' });
      await expect(daily).toHaveAttribute('aria-disabled', 'true');
      await expect(daily).toHaveAttribute('title', reason);
      await daily.click({ force: true });
      await expect(view.saveBar).toHaveCount(0);
      await expect(view.saveDefaults).toHaveAttribute('aria-disabled', 'true');
      await expect(view.saveDefaults).toHaveAttribute('title', reason);
    });
  }
});
