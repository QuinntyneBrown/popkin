// Acceptance Test
// Traces to: L2-176 AC7, L2-117 AC7, L2-086
// Description: Support and Viewer admins read the sign-in length but cannot change it.
import { atTheRecording, signedInAs } from '../../fixtures/admin';
import { expect, test } from '../../fixtures/pk-test';
import { LimitsPage } from '../../pages/admin/limits.page';

test.describe('Limits for Support and Viewer (L2-176 AC7)', () => {
  for (const role of ['Support', 'Viewer'] as const) {
    // Given a Support or Viewer admin, when Limits opens, then it says only Owners can change
    // limits and the field reads its value but takes no change.
    test(`shows the sign-in length read-only to ${role}`, async ({ page, pk }) => {
      await atTheRecording(page);
      await signedInAs(page, role);
      const view = new LimitsPage(page);
      await pk.open('adminLimits');

      await expect(view.sub).toHaveText('Only Owners can change limits.');
      await expect(view.signInLasts).toHaveValue('365');
      await expect(view.signInLasts).not.toBeEditable();
      await expect(view.signInHelp).toHaveText(
        'Days since the person last used Popkin on the device',
      );
      await expect(view.saveBar).toHaveCount(0);
    });
  }
});
