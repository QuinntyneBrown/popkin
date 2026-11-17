// Acceptance Test
// Traces to: L2-140 AC1, AC2, L2-124, ADR 0028, known gaps 104 and 114 (ruled)
// Description: A reminder shows over Contacts until dismissed, opens the contact's profile, and is dismissed for good; Contacts saves the device's zone; turning Phone notifications on in a browser that blocks notifications says so.
import { chidiProfile, contactsMorning, marasDates } from '../fixtures/contacts';
import { expect, test } from '../fixtures/pk-test';
import { chidisReminder, gracesReminder, marasReminders } from '../fixtures/reminders';
import { marasToday } from '../fixtures/today';
import { ContactsDatesPage } from '../pages/contacts-dates.page';
import { Toasts } from '../pages/toasts';

test.use({ timezoneId: 'Europe/London' });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: contactsMorning });
});

test.describe('Reminders in Contacts', () => {
  // L2-140 AC1, L2-124
  test('shows a reminder until it is dismissed, and dismisses it for good', async ({
    page,
    pk,
  }) => {
    await marasToday(page);
    await marasReminders(page, [gracesReminder()]);
    await pk.open('contactsReminder');
    const toasts = new Toasts(page);
    const grace = toasts.headed('Grace turns 33 on Saturday');

    await expect(grace).toBeVisible();
    await expect(grace.locator('.toast__action')).toHaveText('Open Grace’s profile');
    await page.clock.runFor(60_000);
    await expect(grace).toBeVisible();
    const dismissal = page.waitForRequest(
      (r) => r.method() === 'POST' && r.url().endsWith('/dismissal'),
    );
    await grace.getByRole('button', { name: 'Dismiss' }).click();

    await dismissal;
    await expect(grace).toHaveCount(0);
  });

  // L2-140 AC1
  test('opens the contact’s profile from the reminder', async ({ page, pk }) => {
    await marasToday(page);
    await chidiProfile(page);
    await marasReminders(page, [chidisReminder()]);
    await pk.open('contactsToday');
    const toasts = new Toasts(page);

    await toasts.headed('Chidi’s anniversary on 26 September').locator('.toast__action').click();

    await expect(page).toHaveURL(/\/contacts\/people\/[^/]+$/);
    await expect(toasts.headed('Chidi’s anniversary on 26 September')).toHaveCount(0);
  });

  // L2-140 AC2, ADR 0028
  test('says when the browser blocks notifications as Phone notifications is turned on', async ({
    page,
    pk,
  }) => {
    await marasDates(page);
    await pk.open('contactsNotificationsBlocked');
    const dates = new ContactsDatesPage(page);

    await dates.phone.click();
    await dates.phone.click();

    const toasts = new Toasts(page);
    await expect(toasts.warning).toContainText('Notifications are blocked in this browser');
    await expect(toasts.warning).toContainText(
      'Allow them for Popkin in your browser’s settings to get reminders on this device.',
    );
    await expect(dates.phone).toBeChecked();
  });
});
