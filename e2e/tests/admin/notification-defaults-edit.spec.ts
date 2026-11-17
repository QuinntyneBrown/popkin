// Acceptance Test
// Traces to: L2-173 AC1, AC3
// Description: an Owner changes the defaults; the bar at the foot counts what is unsaved and
// discards it, and a value outside its range says which and the range, and cannot be saved.
import { theMockDefaults } from '../../fixtures/admin-notifications';
import { expect, test } from '../../fixtures/pk-test';
import { NotificationsPage } from '../../pages/admin/notifications.page';

test.describe('Changing the defaults (L2-173)', () => {
  // Given the defaults, when the Owner chooses "Daily digest" and bundles within 20 minutes, then
  // the help says what a daily digest sends and the bar counts two unsaved changes; "Discard"
  // puts both back (AC1).
  test('counts unsaved changes and discards them', async ({ page, pk }) => {
    await theMockDefaults(page);
    const view = new NotificationsPage(page);
    await pk.open('adminNotificationsDefaults');

    await view.activityEmail.getByRole('radio', { name: 'Daily digest' }).click();
    await expect(view.activityHelp).toHaveText(
      'One email a day at 6 pm with everything that changed.',
    );
    await view.bundle.fill('20');
    await expect(view.saveBarText).toHaveText('2 unsaved changes');
    await expect(view.defaultsFoot).toHaveCount(0);
    await expect(view.saveDefaults).toBeEnabled();

    await view.discard.click();
    await expect(view.bundle).toHaveValue('10');
    await expect(view.activityEmail.getByRole('radio', { name: 'As it happens' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(view.saveBar).toHaveCount(0);
    await expect(view.defaultsFoot).toHaveText('Nothing changed yet.');
  });

  // Given the defaults, when a value is typed back to what is saved, then nothing is unsaved.
  test('does not count a value typed back as it was', async ({ page, pk }) => {
    await theMockDefaults(page);
    const view = new NotificationsPage(page);
    await pk.open('adminNotificationsDefaults');

    await view.mostEmails.fill('20');
    await expect(view.saveBarText).toHaveText('1 unsaved change');
    await view.mostEmails.fill('12');
    await expect(view.defaultsFoot).toHaveText('Nothing changed yet.');
  });

  // Given the defaults, when a value is outside its range, then its field says which and the
  // range, and the bar says to fix it, with "Save defaults" off (AC3).
  test('says which value is wrong and its range', async ({ page, pk }) => {
    await theMockDefaults(page);
    const view = new NotificationsPage(page);
    await pk.open('adminNotificationsDefaults');

    await view.bundle.fill('0');
    await expect(view.defaultError('Bundle changes within')).toHaveText(
      'Enter a whole number from 1 to 60.',
    );
    await expect(view.bundle).toHaveAttribute('aria-invalid', 'true');
    await expect(view.saveBarText).toHaveText('Fix the highlighted default to save');
    await expect(view.saveDefaults).toBeDisabled();

    await view.bundle.fill('61');
    await expect(view.defaultError('Bundle changes within')).toHaveText(
      'Enter a whole number from 1 to 60.',
    );
    await view.bundle.fill('20');
    await expect(view.defaultError('Bundle changes within')).toHaveCount(0);
    await expect(view.saveBarText).toHaveText('1 unsaved change');

    await view.mostEmails.fill('101');
    await expect(view.defaultError('Most emails per person per day')).toHaveText(
      'Enter a whole number from 1 to 100.',
    );
    await view.mostEmails.fill('12');

    await view.quietFrom.fill('21:15');
    await expect(view.defaultError('Quiet hours')).toHaveText(
      'Enter a time on the hour or half hour, such as 21:00.',
    );
    await expect(view.quietFrom).toHaveAttribute('aria-invalid', 'true');
    await expect(view.quietTo).not.toHaveAttribute('aria-invalid', 'true');

    await view.quietFrom.fill('08:00');
    await expect(view.defaultError('Quiet hours')).toHaveText(
      'Quiet hours can’t start and end at the same time.',
    );
    await expect(view.saveDefaults).toBeDisabled();
  });
});
