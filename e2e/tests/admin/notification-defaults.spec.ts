// Acceptance Test
// Traces to: L2-173 AC1, AC2
// Description: an admin opens Defaults and sees what a new member starts with: how often activity
// email comes, how long changes are bundled, the most emails a day, the quiet hours and how early
// a birthday reminds, each at its first value until an Owner changes it.
import { problem } from '../../fixtures/stubs';
import { theMockDefaults } from '../../fixtures/admin-notifications';
import { expect, test } from '../../fixtures/pk-test';
import { NotificationsPage } from '../../pages/admin/notifications.page';

test.describe('Defaults (L2-173)', () => {
  // Given defaults no Owner has changed, when an admin opens Defaults, then "For new members"
  // shows each default at its first value, with its help, and "Nothing changed yet." (AC1, AC2).
  test('shows what a new member starts with', async ({ page, pk }) => {
    await theMockDefaults(page);
    const view = new NotificationsPage(page);
    await pk.open('adminNotificationsDefaults');

    await expect(view.tab('Defaults')).toHaveAttribute('aria-selected', 'true');
    await expect(view.defaultsSub).toHaveText(
      'What a member starts with. Anyone who has changed a setting keeps theirs.',
    );
    await expect(view.defaultNames).toHaveText([
      'Activity email',
      'Bundle changes within',
      'Most emails per person per day',
      'Quiet hours',
      'Birthday reminders',
    ]);
    await expect(view.activityEmail.getByRole('radio', { name: 'As it happens' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(view.activityHelp).toHaveText(
      'One email per change, bundled if several land within 10 minutes.',
    );
    await expect(view.bundle).toHaveValue('10');
    await expect(view.mostEmails).toHaveValue('12');
    await expect(view.quietFrom).toHaveValue('21:00');
    await expect(view.quietTo).toHaveValue('08:00');
    await expect(view.birthdayLead.locator('option:checked')).toHaveText('1 week before');
    await expect(view.birthdayLead.locator('option')).toHaveText([
      'Off',
      'On the day',
      '1 day before',
      '3 days before',
      '1 week before',
    ]);
    await expect(view.defaultsFoot).toHaveText('Nothing changed yet.');
    await expect(view.saveDefaults).toBeDisabled();
  });

  // Given the Kinds tab, when the admin chooses "Defaults", then the address keeps the tab.
  test('opens Defaults from its tab', async ({ page, pk }) => {
    await theMockDefaults(page);
    const view = new NotificationsPage(page);
    await pk.open('adminNotifications');

    await view.tab('Defaults').click();
    await expect(page).toHaveURL(/\?tab=defaults$/);
    await expect(view.bundle).toHaveValue('10');
  });

  // Given the API fails, when Defaults shows, then it says it couldn't load them, and "Try
  // again" reads them.
  test('says when it cannot load the defaults, and tries again', async ({ page, pk }) => {
    await theMockDefaults(page);
    let failing = true;
    await page.route('**/api/admin/notifications/defaults', (route) => {
      if (!failing) return route.fallback();
      const failed = problem(500, 'server_error');
      return route.fulfill({ status: failed.status, json: failed.body });
    });
    const view = new NotificationsPage(page);
    await pk.open('adminNotificationsDefaults');

    await expect(view.empty).toContainText('Couldn’t load the defaults');
    await expect(view.empty).toContainText(
      'The admin API didn’t answer. Nothing has changed; try again, or check Health if it keeps happening.',
    );
    failing = false;
    await view.tryAgain.click();
    await expect(view.bundle).toHaveValue('10');
  });
});
