// Acceptance Test
// Traces to: L2-176 AC4, AC5, L2-117 AC3, AC4
// Description: an Owner edits the sign-in length; the save bar counts the change, a value that is
// not a whole number from 1 to 400 is marked with the range, and Discard puts the saved one back.
import { atTheRecording } from '../../fixtures/admin';
import { expect, test } from '../../fixtures/pk-test';
import { LimitsPage } from '../../pages/admin/limits.page';

test.describe('Editing the sign-in length (L2-176)', () => {
  test.beforeEach(({ page }) => atTheRecording(page));

  // Given Limits, when the Owner types 30, then the row shows its default and the bar reads
  // "1 unsaved change" with "Discard" and "Save limits"; Discard brings back 365 (AC5).
  test('counts the unsaved change and discards it', async ({ page, pk }) => {
    const view = new LimitsPage(page);
    await pk.open('adminLimits');

    await view.signInLasts.fill('30');

    await expect(view.saveBarText).toHaveText('1 unsaved change');
    await expect(view.saveLimits).toBeEnabled();
    await view.discard.click();
    await expect(view.saveBar).toHaveCount(0);
    await expect(view.signInLasts).toHaveValue('365');
  });

  // Given a value outside 1 to 400, when it is entered, then the field says so, is marked
  // invalid for assistive technology, and the bar says what to fix with save off (AC4).
  for (const value of ['0', '401', '7.5', '']) {
    test(`refuses ${value || 'an empty value'}`, async ({ page, pk }) => {
      const view = new LimitsPage(page);
      await pk.open('adminLimits');

      await view.signInLasts.fill(value);

      await expect(view.signInError).toHaveText('Enter a whole number from 1 to 400.');
      await expect(view.signInLasts).toHaveAttribute('aria-invalid', 'true');
      await expect(view.saveBarText).toHaveText('Fix the highlighted limit to save');
      await expect(view.saveLimits).toBeDisabled();
    });
  }

  // Given the saved value typed again, then nothing is unsaved.
  test('shows no bar for the saved value', async ({ page, pk }) => {
    const view = new LimitsPage(page);
    await pk.open('adminLimits');

    await view.signInLasts.fill('30');
    await view.signInLasts.fill('365');

    await expect(view.saveBar).toHaveCount(0);
  });
});
