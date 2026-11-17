import {
  emailCanBeTurnedBackOn,
  savingFails,
  savingTheKind,
  settingsWithoutAnEmailAddress,
  theMockNotificationSettings,
  theMockPopkinLevels,
  noOneMatches,
  theMockMutedPeople,
  MOCK_POPKINS,
  theNotificationSettingsFailing,
  theNotificationSettingsFailingOnce,
  theNotificationSettingsLoading,
  noBirthdaysYet,
  newPhotosOffForEveryone,
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

  // L2-171 AC4
  test('a kind off for everyone keeps the member’s choice, disabled, and says Popkin switched it off', async ({
    page,
    pk,
  }) => {
    await newPhotosOffForEveryone(page);

    await pk.open('notificationSettingsOffByPopkin');
    const notifications = new NotificationSettingsPage(page);

    await expect(notifications.kindSwitch('New photos', 'email')).toBeDisabled();
    await expect(notifications.kindSwitch('New photos', 'phone')).toBeDisabled();
    await expect(notifications.kindSwitch('New photos', 'email')).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(notifications.group('When something changes')).toContainText(
      'Switched off by Popkin for now',
    );
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

test.describe('each Popkin’s level', () => {
  const lakeside = MOCK_POPKINS[0];
  const saved = (page: import('@playwright/test').Page) =>
    page.waitForRequest(
      (request) =>
        request.method() === 'PUT' &&
        request.url().endsWith(`/api/me/notifications/popkins/${lakeside.popkinId}`),
    );

  // L2-158 AC1
  test('the Popkins view lists each Popkin with its people and its level', async ({ page, pk }) => {
    await theMockPopkinLevels(page);
    await pk.open('notificationSettings');
    const notifications = new NotificationSettingsPage(page);

    await notifications.view('Popkins').click();

    await expect(page).toHaveURL('/account/notifications?tab=popkins');
    await expect(notifications.view('Popkins')).toHaveAttribute('aria-current', 'page');
    await expect(notifications.popkinRows).toHaveCount(3);
    await expect(notifications.popkinRow('Lakeside Weekend')).toContainText(
      '14 people · wraps up Sunday',
    );
    await expect(notifications.popkinRow('Tigers U9 Parents')).toContainText(
      '22 people · until Nov 30',
    );
    await expect(notifications.level('Lakeside Weekend', 'Everything')).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(notifications.level('Thursday Night Group', 'Just for me')).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(notifications.groups).toHaveCount(0);
    await expect(
      page.getByText('New Popkins you join start on Everything.', { exact: false }),
    ).toBeVisible();
  });

  // L2-158 AC2, AC3, AC4
  test('muting a Popkin says what still comes, and Undo puts Everything back', async ({
    page,
    pk,
  }) => {
    await theMockPopkinLevels(page);
    await pk.open('notificationSettingsPopkins');
    const notifications = new NotificationSettingsPage(page);

    const muted = saved(page);
    await notifications.level('Lakeside Weekend', 'Muted').click();

    expect((await muted).postDataJSON()).toEqual({ level: 'Muted' });
    await expect(notifications.popkinRow('Lakeside Weekend')).toContainText(
      'Muted. Nothing but reminders',
    );
    await expect(notifications.undoBar).toContainText(
      'Lakeside Weekend is muted. You’ll still get its reminders.',
    );
    const undone = saved(page);
    await notifications.undo.click();
    expect((await undone).postDataJSON()).toEqual({ level: 'Everything' });
    await expect(notifications.level('Lakeside Weekend', 'Everything')).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(notifications.undoBar).toHaveCount(0);
  });

  // L2-158 AC2; the radio group takes one tab stop and the arrow keys choose
  test('a level is chosen with the arrow keys', async ({ page, pk }) => {
    await theMockPopkinLevels(page);
    await pk.open('notificationSettingsPopkins');
    const notifications = new NotificationSettingsPage(page);
    await notifications.level('Lakeside Weekend', 'Everything').focus();

    const chosen = saved(page);
    await page.keyboard.press('ArrowRight');

    expect((await chosen).postDataJSON()).toEqual({ level: 'JustForMe' });
    await expect(notifications.level('Lakeside Weekend', 'Just for me')).toBeFocused();
    await expect(notifications.level('Lakeside Weekend', 'Just for me')).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });
});

test.describe('muted people', () => {
  // L2-160 AC1
  test('the People view lists the people muted, with the Popkins they share', async ({
    page,
    pk,
  }) => {
    await theMockMutedPeople(page);
    await pk.open('notificationSettings');
    const notifications = new NotificationSettingsPage(page);

    await notifications.view('People').click();

    await expect(page).toHaveURL('/account/notifications?tab=people');
    await expect(notifications.mutedRows).toHaveCount(2);
    await expect(notifications.mutedRow('Sam Ortega')).toContainText('in Thursday Night Group');
    await expect(notifications.unmute('Joel Kim')).toBeVisible();
  });

  // L2-160 AC1, AC2: the picker by keyboard
  test('Mute someone finds a person by name and mutes them by keyboard', async ({ page, pk }) => {
    await theMockMutedPeople(page);
    await pk.open('notificationSettingsPeople');
    const notifications = new NotificationSettingsPage(page);

    await notifications.muteSomeone.click();
    await expect(notifications.muteSomeone).toHaveAttribute('aria-expanded', 'true');
    await expect(notifications.pickerSearch).toBeFocused();
    await expect(notifications.pickerPeople).toHaveCount(5);
    await notifications.pickerSearch.fill('wa');
    await expect(notifications.pickerPeople).toHaveCount(1);
    const muted = page.waitForRequest(
      (request) =>
        request.method() === 'POST' && request.url().endsWith('/api/me/notifications/mutes'),
    );
    await page.keyboard.press('ArrowDown');
    await expect(notifications.pickerPerson('Walt Brennan')).toBeFocused();
    await page.keyboard.press('Enter');

    expect((await muted).postDataJSON()).toEqual({
      membershipId: '3c5a9b20-0000-4000-8000-000000000005',
    });
    await expect(notifications.picker).toHaveCount(0);
    await expect(notifications.muteSomeone).toBeFocused();
    await expect(notifications.mutedRows.first()).toContainText('Walt Brennan');
  });

  // L2-160: a search that finds nobody says so, and a muted person with no Popkin left in common says that
  test('the picker says when nobody matches, and a muted person may share no Popkin now', async ({
    page,
    pk,
  }) => {
    await noOneMatches(page);
    await pk.open('notificationSettingsMuteNoMatch');
    const notifications = new NotificationSettingsPage(page);

    await expect(notifications.mutedRow('Joel Kim')).toContainText('No Popkins in common now');
    await notifications.muteSomeone.click();
    await notifications.pickerSearch.fill('zed');

    await expect(notifications.pickerNote).toHaveText('No one in your Popkins matches that.');
    await expect(notifications.pickerPeople).toHaveCount(0);
  });

  // Escape closes the picker and returns focus
  test('Escape closes the picker', async ({ page, pk }) => {
    await theMockMutedPeople(page);
    await pk.open('notificationSettingsPeople');
    const notifications = new NotificationSettingsPage(page);
    await notifications.muteSomeone.click();

    await page.keyboard.press('Escape');

    await expect(notifications.picker).toHaveCount(0);
    await expect(notifications.muteSomeone).toBeFocused();
    await expect(notifications.muteSomeone).toHaveAttribute('aria-expanded', 'false');
  });

  // L2-160 AC5
  test('unmuting the last person says no one is muted', async ({ page, pk }) => {
    await theMockMutedPeople(page);
    await pk.open('notificationSettingsPeople');
    const notifications = new NotificationSettingsPage(page);

    await notifications.unmute('Sam Ortega').click();
    await notifications.unmute('Joel Kim').click();

    await expect(notifications.mutedRows).toHaveCount(0);
    await expect(notifications.noOneMuted).toHaveText(
      'No one’s muted. You hear about everyone in your Popkins.',
    );
  });
});

test.describe('birthday reminders by person', () => {
  test.beforeEach(async ({ page }) => {
    await theMockMutedPeople(page);
  });

  // L2-159 AC1, AC2
  test('the People view lists the five soonest birthdays, and Show all lists the rest', async ({
    page,
    pk,
  }) => {
    await pk.open('notificationSettingsPeople');
    const settings = new NotificationSettingsPage(page);

    await expect(settings.birthdaySection).toContainText(
      'From the birthdays in your contacts. Pick how early, person by person.',
    );
    await expect(settings.birthdayRows.locator('.setting-list__name')).toHaveText([
      'Grace Adeyemi',
      'Ada Okafor',
      'Ruth Lindqvist',
      'Chidi Okafor',
      'Ifeoma Okafor',
    ]);
    await expect(settings.birthdayRow('Grace Adeyemi')).toContainText(
      'Sat 19 Sep · turns 33 · in 7 days',
    );
    await expect(settings.birthdayLead('Ruth Lindqvist')).toHaveValue('ThreeDaysBefore');
    await expect(settings.birthdaySwitch('Grace Adeyemi')).toHaveAttribute('aria-checked', 'true');
    await expect(settings.birthdaySwitch('Ifeoma Okafor')).toHaveAttribute('aria-checked', 'false');
    await expect(settings.birthdayLead('Ifeoma Okafor')).toBeDisabled();

    await settings.showAllBirthdays.click();

    await expect(settings.birthdayRows).toHaveCount(7);
    await expect(settings.birthdayRow('Walt Brennan')).toContainText('Tue 2 Mar · in 171 days');
    await expect(settings.birthdayLead('Walt Brennan')).toBeFocused();
    await expect(settings.showAllBirthdays).toHaveCount(0);
  });

  // L2-159 AC3, L2-139 AC5
  test('a lead chosen here is saved on the date itself', async ({ page, pk }) => {
    await pk.open('notificationSettingsPeople');
    const settings = new NotificationSettingsPage(page);
    const sent = page.waitForRequest(
      (r) => r.method() === 'PUT' && r.url().includes('/api/contacts/key-dates/'),
    );

    await settings.birthdayLead('Grace Adeyemi').selectOption('TwoWeeksBefore');

    expect((await sent).postDataJSON()).toEqual({ lead: 'TwoWeeksBefore' });
    await expect(settings.birthdayLead('Grace Adeyemi')).toHaveValue('TwoWeeksBefore');
    await expect(settings.undoBar).toHaveCount(0);
  });

  // L2-159 AC4, AC5
  test('switching a birthday off greys its lead and says so, and Undo turns it on', async ({
    page,
    pk,
  }) => {
    await pk.open('notificationSettingsBirthdayOff');
    const settings = new NotificationSettingsPage(page);

    await settings.stopGracesBirthday();

    await expect(settings.birthdaySwitch('Grace Adeyemi')).toHaveAttribute('aria-checked', 'false');
    await expect(settings.birthdayLead('Grace Adeyemi')).toBeDisabled();
    await expect(settings.birthdayLead('Grace Adeyemi')).toHaveValue('OneWeekBefore');
    await expect(settings.undoBar).toContainText(
      'Birthday reminders for Grace Adeyemi are off. The birthday stays in your contacts.',
    );
    const sent = page.waitForRequest(
      (r) => r.method() === 'PUT' && r.url().includes('/api/contacts/key-dates/'),
    );

    await settings.undo.click();

    expect((await sent).postDataJSON()).toEqual({ on: true });
    await expect(settings.birthdaySwitch('Grace Adeyemi')).toHaveAttribute('aria-checked', 'true');
    await expect(settings.birthdayLead('Grace Adeyemi')).toBeEnabled();
    await expect(settings.undoBar).toHaveCount(0);
  });

  // L2-159 AC6
  test('with no birthday in Contacts the section says how to add one', async ({ page, pk }) => {
    await noBirthdaysYet(page);
    await pk.open('notificationSettingsNoBirthdays');
    const settings = new NotificationSettingsPage(page);

    await expect(settings.noBirthdays).toHaveText(
      'No birthdays yet. Add one to a contact and it shows here.',
    );
    await expect(settings.birthdayRows).toHaveCount(0);
    await expect(settings.showAllBirthdays).toHaveCount(0);
  });
});
