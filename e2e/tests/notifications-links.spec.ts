import {
  EXPIRED_LINK,
  WORKING_LINK,
  theLinkFailsOnce,
  theLinkIsSlow,
  theLinkWorks,
} from '../fixtures/notification-links';
import {
  MOCK_BIRTHDAYS,
  MOCK_POPKINS,
  theMockMutedPeople,
  theMockPopkinLevels,
} from '../fixtures/notifications';
import { asVisitor } from '../fixtures/journeys';
import { expect, test } from '../fixtures/pk-test';
import { NotificationSettingsPage } from '../pages/notification-settings.page';
import { SignInPage } from '../pages/sign-in.page';
import { UnsubscribePage } from '../pages/unsubscribe.page';

test.describe('an email’s footer links', () => {
  // L2-168 AC3: one click, no session.
  test('"Unsubscribe from all email" turns every email off without signing in', async ({
    page,
  }) => {
    await asVisitor(page);
    await theLinkWorks(page);
    const unsubscribe = new UnsubscribePage(page);

    await unsubscribe.open(WORKING_LINK);

    await expect(unsubscribe.root).toBeVisible();
    await expect(page).toHaveTitle('Unsubscribe · Popkin');
    await expect(unsubscribe.heading).toHaveText('You’re unsubscribed from all Popkin email.');
    await expect(unsubscribe.text).toHaveText('Sign-in codes still arrive.');
    await expect(unsubscribe.turnEmailBackOn).toHaveAttribute(
      'href',
      '/account/notifications?tab=types',
    );
  });

  // L2-168 AC3: the page says it is working while its one request is out.
  test('says it is unsubscribing while the request is out', async ({ page }) => {
    await asVisitor(page);
    const release = await theLinkIsSlow(page);
    const unsubscribe = new UnsubscribePage(page);

    await unsubscribe.open(WORKING_LINK);

    await expect(unsubscribe.working).toBeAttached();
    release();
    await expect(unsubscribe.heading).toHaveText('You’re unsubscribed from all Popkin email.');
  });

  // L2-168 AC5: the same words whatever made the link fail.
  test('an expired link says so and offers sign-in', async ({ page }) => {
    await asVisitor(page);
    const unsubscribe = new UnsubscribePage(page);

    await unsubscribe.open(EXPIRED_LINK);

    await expect(unsubscribe.heading).toHaveText('This link has expired.');
    await expect(unsubscribe.text).toHaveText('Sign in to change your email settings.');
    await expect(unsubscribe.signIn).toHaveAttribute('href', '/account/notifications');
  });

  test('a request that fails changes nothing, and Try again unsubscribes', async ({ page }) => {
    await asVisitor(page);
    await theLinkFailsOnce(page);
    const unsubscribe = new UnsubscribePage(page);

    await unsubscribe.open(WORKING_LINK);
    await expect(unsubscribe.heading).toHaveText('We couldn’t unsubscribe you.');
    await unsubscribe.tryAgain.click();

    await expect(unsubscribe.heading).toHaveText('You’re unsubscribed from all Popkin email.');
  });

  // L2-168 AC3, L2-007 AC2: "Turn email back on" signs the person in first.
  test('"Turn email back on" opens sign-in on the way to Notifications', async ({ page }) => {
    await asVisitor(page);
    await theLinkWorks(page);
    const unsubscribe = new UnsubscribePage(page);
    await unsubscribe.open(WORKING_LINK);

    await unsubscribe.turnEmailBackOn.click();

    await expect(new SignInPage(page).root).toBeVisible();
    await expect(page).toHaveURL(
      `/sign-in?returnUrl=${encodeURIComponent('/account/notifications?tab=types')}`,
    );
  });

  // L2-158 AC4, L2-168 AC1: "Mute {Popkin}" mutes it, offers Undo, and is not applied twice.
  test('"Mute {Popkin}" mutes it, and Undo restores Everything', async ({ page }) => {
    await theMockPopkinLevels(page);
    const lakeside = MOCK_POPKINS[0];
    const notifications = new NotificationSettingsPage(page);

    await page.goto(`/account/notifications?tab=popkins&mute=${lakeside.popkinId}`);

    await expect(notifications.popkinRow(lakeside.name)).toContainText(
      'Muted. Nothing but reminders',
    );
    await expect(notifications.undoBar).toContainText(`${lakeside.name} is muted.`);
    await expect(page).toHaveURL('/account/notifications?tab=popkins');
    await notifications.undo.click();
    await expect(notifications.level(lakeside.name, 'Everything')).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  // L2-159 AC5, L2-168 AC1: "Stop birthday reminders for {name}" switches that birthday off,
  // offers Undo, and is not applied twice.
  test('"Stop birthday reminders" switches that birthday off, and Undo turns it on', async ({
    page,
  }) => {
    await theMockMutedPeople(page);
    const grace = MOCK_BIRTHDAYS[0];
    const notifications = new NotificationSettingsPage(page);
    const stopped = page.waitForRequest(
      (r) => r.method() === 'PUT' && r.url().endsWith(`/key-dates/${grace.keyDateId}/reminder`),
    );

    await page.goto(`/account/notifications?tab=people&stop-birthday=${grace.keyDateId}`);

    expect((await stopped).postDataJSON()).toEqual({ on: false });
    await expect(notifications.birthdaySwitch(grace.name)).toHaveAttribute('aria-checked', 'false');
    await expect(notifications.undoBar).toContainText(
      `Birthday reminders for ${grace.name} are off. The birthday stays in your contacts.`,
    );
    await expect(page).toHaveURL('/account/notifications?tab=people');
    await notifications.undo.click();
    await expect(notifications.birthdaySwitch(grace.name)).toHaveAttribute('aria-checked', 'true');
  });
});
