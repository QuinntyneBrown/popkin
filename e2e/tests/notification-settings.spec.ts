import {
  settingsWithoutAnEmailAddress,
  theMockNotificationSettings,
  theNotificationSettingsFailing,
  theNotificationSettingsFailingOnce,
  theNotificationSettingsLoading,
} from '../fixtures/notifications';
import { expect, test } from '../fixtures/pk-test';
import { AccountPage } from '../pages/account.page';
import { NotificationSettingsPage } from '../pages/notification-settings.page';

test.describe('the Notifications screen', () => {
  // L2-048 AC6
  test('opens from "Notifications" on the account, and Back returns there', async ({
    page,
    pk,
  }) => {
    await theMockNotificationSettings(page);
    await pk.open('account');

    await new AccountPage(page).notifications.click();

    const notifications = new NotificationSettingsPage(page);
    await expect(page).toHaveURL('/account/notifications');
    await expect(notifications.root).toBeVisible();
    await expect(page).toHaveTitle('Notifications · Popkin');
    await notifications.back.click();
    await expect(page).toHaveURL('/account');
  });

  // L2-155 AC1, L2-156 AC1
  test('shows the activity email, chosen as it happens', async ({ page, pk }) => {
    await theMockNotificationSettings(page);
    await pk.open('notificationSettings');
    const notifications = new NotificationSettingsPage(page);

    await expect(notifications.heading).toHaveText('Notifications');
    await expect(notifications.emailSection).toContainText(
      'Reminders and sign-in codes always arrive on time.',
    );
    await expect(notifications.emailSwitch).toHaveAttribute('aria-checked', 'true');
    await expect(notifications.frequency.getByRole('radio')).toHaveCount(3);
    await expect(notifications.frequencyOption('As it happens')).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(notifications.frequencyOption('Daily digest')).toContainText(
      'One email at 6 pm with everything from the day.',
    );
    await expect(notifications.frequencyOption('Weekly digest')).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  // L2-154 AC1, AC3, L2-155 AC7, L2-157 AC1, AC2
  test('lists the kinds in their three groups, each with a named switch per channel', async ({
    page,
    pk,
  }) => {
    await theMockNotificationSettings(page);
    await pk.open('notificationSettings');
    const notifications = new NotificationSettingsPage(page);

    await expect(notifications.groups).toHaveCount(3);
    await expect(notifications.group('When something changes')).toContainText(
      'Anything new in a Popkin you’re in.',
    );
    await expect(notifications.group('Reminders')).toContainText(
      'Nudges ahead of dates that matter.',
    );
    await expect(notifications.kindSwitch('Group chat', 'email')).toHaveAttribute(
      'aria-checked',
      'false',
    );
    await expect(notifications.kindSwitch('Group chat', 'phone')).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(notifications.kindSwitch('Stories due', 'phone')).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(notifications.group('Your account')).toContainText('Sign-in codes and security');
    await expect(notifications.alwaysOn).toHaveText('Always on');
    await expect(notifications.kindSwitch('Sign-in codes and security', 'email')).toHaveCount(0);
  });

  // L2-156 AC5
  test('an account without an email address has no email to switch on', async ({ page, pk }) => {
    await settingsWithoutAnEmailAddress(page);
    await pk.open('notificationSettings');
    const notifications = new NotificationSettingsPage(page);

    await expect(notifications.emailSwitch).toHaveAttribute('aria-checked', 'false');
    await expect(notifications.emailSwitch).toBeDisabled();
    await expect(notifications.noEmail).toBeVisible();
    await expect(notifications.frequency).toHaveCount(0);
  });

  // L2-056 AC1
  test('says it is loading while the settings are on their way', async ({ page, pk }) => {
    const release = await theNotificationSettingsLoading(page);
    await pk.open('notificationSettings');
    const notifications = new NotificationSettingsPage(page);

    await expect(notifications.loading).toBeAttached();
    await expect(notifications.groups).toHaveCount(0);
    release();
    await expect(notifications.groups).toHaveCount(3);
  });

  // L2-155 AC6
  test('a failed load shows no control, and Try again loads it', async ({ page, pk }) => {
    await theNotificationSettingsFailingOnce(page);
    await pk.open('notificationSettings');
    const notifications = new NotificationSettingsPage(page);

    await expect(notifications.error).toBeVisible();
    await expect(page.getByRole('switch')).toHaveCount(0);
    await expect(notifications.yourAccount).toHaveAttribute('href', '/account');

    await notifications.tryAgain.click();

    await expect(notifications.groups).toHaveCount(3);
  });

  // L2-155 AC6
  test('a load that keeps failing keeps saying so', async ({ page, pk }) => {
    await theNotificationSettingsFailing(page);
    await pk.open('notificationSettings');

    await expect(new NotificationSettingsPage(page).error).toBeVisible();
  });
});
