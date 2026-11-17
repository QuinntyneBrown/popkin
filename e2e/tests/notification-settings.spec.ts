import {
  emailCanBeTurnedBackOn,
  savingFails,
  savingTheKind,
  settingsWithoutAnEmailAddress,
  theMockNotificationSettings,
  theNotificationSettingsFailing,
  theNotificationSettingsFailingOnce,
  theNotificationSettingsLoading,
} from '../fixtures/notifications';
import { expect, test } from '../fixtures/pk-test';
import { AccountPage } from '../pages/account.page';
import { NotificationSettingsPage } from '../pages/notification-settings.page';
import { Toasts } from '../pages/toasts';

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

test.describe('changing what you hear about', () => {
  // L2-155 AC5, L2-157 AC3
  test('a switch is saved as it changes, with no Save button', async ({ page, pk }) => {
    await theMockNotificationSettings(page);
    await pk.open('notificationSettings');
    const notifications = new NotificationSettingsPage(page);
    const saved = page.waitForRequest(
      (request) =>
        request.method() === 'PUT' &&
        request.url().endsWith('/api/me/notifications/kinds/GroupChat'),
    );

    await notifications.kindSwitch('Group chat', 'email').click();

    expect((await saved).postDataJSON()).toEqual({ email: true });
    await expect(notifications.kindSwitch('Group chat', 'email')).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(page.getByRole('button', { name: 'Save' })).toHaveCount(0);
  });

  // L2-155 AC5
  test('a save that fails puts the switch back and says so', async ({ page, pk }) => {
    await theMockNotificationSettings(page);
    await savingFails(page);
    await pk.open('notificationSettings');
    const notifications = new NotificationSettingsPage(page);

    await notifications.kindSwitch('Group chat', 'email').click();

    await expect(new Toasts(page).headed('We couldn’t save that. Try again.')).toBeVisible();
    await expect(notifications.kindSwitch('Group chat', 'email')).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  // L2-156 AC1, AC2
  test('a frequency is chosen by touch or by the arrow keys', async ({ page, pk }) => {
    await theMockNotificationSettings(page);
    await pk.open('notificationSettings');
    const notifications = new NotificationSettingsPage(page);

    await notifications.frequencyOption('Daily digest').click();
    await expect(notifications.frequencyOption('Daily digest')).toHaveAttribute(
      'aria-checked',
      'true',
    );

    await page.keyboard.press('ArrowRight');
    await expect(notifications.frequencyOption('Weekly digest')).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(notifications.frequencyOption('Weekly digest')).toBeFocused();
  });

  // L2-156 AC3, AC4
  test('email off disables every email switch and says so; Turn email back on restores them', async ({
    page,
    pk,
  }) => {
    await theMockNotificationSettings(page);
    await pk.open('notificationSettings');
    const notifications = new NotificationSettingsPage(page);

    await notifications.emailSwitch.click();

    await expect(notifications.undoBar).toHaveText(
      /You’re unsubscribed from all Popkin email\. Sign-in codes still arrive, and your phone alerts are unchanged\./,
    );
    await expect(notifications.undoBar).toHaveAttribute('role', 'status');
    await expect(notifications.kindSwitch('Mentions and replies', 'email')).toBeDisabled();
    await expect(notifications.kindSwitch('Mentions and replies', 'email')).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(notifications.kindSwitch('Mentions and replies', 'phone')).toBeEnabled();
    await expect(notifications.frequencyOption('As it happens')).toBeDisabled();

    await emailCanBeTurnedBackOn(page);
    await notifications.turnEmailBackOn.click();

    await expect(notifications.undoBar).toHaveCount(0);
    await expect(notifications.emailSwitch).toHaveAttribute('aria-checked', 'true');
    await expect(notifications.kindSwitch('Mentions and replies', 'email')).toBeEnabled();
  });

  // L2-156 AC3
  test('the banner can be dismissed and email stays off', async ({ page, pk }) => {
    await theMockNotificationSettings(page);
    await pk.open('notificationSettings');
    const notifications = new NotificationSettingsPage(page);
    await notifications.emailSwitch.click();

    await notifications.dismissBar.click();

    await expect(notifications.undoBar).toHaveCount(0);
    await expect(notifications.emailSwitch).toHaveAttribute('aria-checked', 'false');
  });
});

test.describe('this device', () => {
  // L2-161 AC7: where the person is, saved once the app knows who they are
  test('the app saves the device’s time zone when it starts', async ({ page, pk }) => {
    await theMockNotificationSettings(page);
    const saved = page.waitForRequest(
      (r) => r.method() === 'PUT' && r.url().endsWith('/api/me/time-zone'),
    );

    await pk.open('notificationSettings');

    const zone = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
    expect((await saved).postDataJSON()).toEqual({ zone });
  });

  // L2-157 AC5, ADR 0028
  test('a phone switch turned on where alerts are refused stays on and says so', async ({
    page,
    pk,
  }) => {
    await theMockNotificationSettings(page);
    await savingTheKind(page, 'NewPhotos');
    await pk.open('notificationSettings');
    const notifications = new NotificationSettingsPage(page);

    await notifications.kindSwitch('New photos', 'phone').click();

    await expect(notifications.kindSwitch('New photos', 'phone')).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(notifications.group('When something changes')).toContainText(
      'This device hasn’t allowed alerts.',
    );
  });
});
