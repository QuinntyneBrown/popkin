// Acceptance Test
// Traces to: L2-169 AC1, AC2, AC4–AC6, L2-089 AC1, AC7
// Description: an admin opens Notifications from the console's menu and sees whether member
// email is going out, the three tabs, and each kind's totals; the page loads in the shape of its
// panels and says so when it cannot load.
import { theMockNotifications } from '../../fixtures/admin-notifications';
import { expect, test } from '../../fixtures/pk-test';
import { hold, problem } from '../../fixtures/stubs';
import { NotificationsPage } from '../../pages/admin/notifications.page';

test.describe('Notifications (L2-169)', () => {
  // Given email is sending, when an admin opens Notifications from the menu, then the page names
  // itself, the status reads "Email is sending" with the day's totals, and the tabs count the
  // kinds and the holds (AC1, AC2).
  test('shows the sending status and the tabs', async ({ page, pk }) => {
    await theMockNotifications(page);
    const notifications = new NotificationsPage(page);
    await pk.open('adminAudit');

    await notifications.shell.nav.getByRole('link', { name: 'Notifications' }).click();

    await expect(notifications.root).toBeVisible();
    await expect(notifications.heading).toHaveText('Notifications');
    await expect(notifications.sub).toHaveText(
      'Email and phone alerts to members. Switch a kind off for everyone, or hold mail for one Popkin or person.',
    );
    await expect(notifications.statusTitle).toHaveText('Email is sending');
    await expect(notifications.statusText).toHaveText(
      '48,210 sent today · 0.4% bounced · median 41 s from change to inbox',
    );
    await expect(notifications.tab('Kinds')).toHaveAccessibleName('Kinds 12');
    await expect(notifications.tab('Kinds')).toHaveAttribute('aria-selected', 'true');
    await expect(notifications.tab('Holds')).toHaveAccessibleName('Holds 4');
    await expect(notifications.tab('Defaults')).toHaveText('Defaults');
    await expect(notifications.shell.current).toHaveText('Notifications');
  });

  // Given opens and bounces are not counted yet (gap 129), when the status shows, then the
  // bounce share reads "—" rather than a figure nobody measured.
  test('reads a dash for a figure not counted yet', async ({ page, pk }) => {
    await theMockNotifications(page, (n) => {
      n.status.bouncedPercent = null;
    });
    const notifications = new NotificationsPage(page);
    await pk.open('adminNotifications');

    await expect(notifications.statusText).toHaveText(
      '48,210 sent today · — bounced · median 41 s from change to inbox',
    );
  });

  // Given the page is loading, when it shows, then it says so in words (L2-089 AC7).
  test('says it is loading', async ({ page, pk }) => {
    await theMockNotifications(page);
    const release = await hold(page, 'GET /api/admin/notifications');
    const notifications = new NotificationsPage(page);
    await pk.open('adminNotifications');

    await expect(notifications.loading).toBeAttached();
    release();
    await expect(notifications.statusTitle).toHaveText('Email is sending');
  });

  // Given the API fails, when the page shows, then it says it couldn't load, and "Try again"
  // loads it (L2-089 AC7).
  test('says when it cannot load, and tries again', async ({ page, pk }) => {
    await theMockNotifications(page);
    let failing = true;
    await page.route('**/api/admin/notifications', (route) => {
      if (!failing) return route.fallback();
      const failed = problem(500, 'server_error');
      return route.fulfill({ status: failed.status, json: failed.body });
    });
    const notifications = new NotificationsPage(page);
    await pk.open('adminNotifications');

    await expect(notifications.empty).toContainText('Couldn’t load notifications');
    await expect(notifications.empty).toContainText(
      'The admin API didn’t answer. Nothing has changed and mail keeps sending; try again, or check Health if it keeps happening.',
    );
    failing = false;
    await notifications.tryAgain.click();
    await expect(notifications.statusTitle).toHaveText('Email is sending');
  });

  // Given "Kinds", when it shows, then every kind of L2-154 is listed under its group with what
  // sends it, its totals and a switch "{kind} for everyone"; "Sign-in codes and security" reads
  // "Required" with a lock; a kind off for everyone reads "Off for everyone", "—" and why
  // (AC4, AC6, L2-171 AC2).
  test('lists every kind under its group', async ({ page, pk }) => {
    await theMockNotifications(page);
    const notifications = new NotificationsPage(page);
    await pk.open('adminNotifications');

    await expect(notifications.groups).toHaveText([
      'When something changes',
      'Reminders',
      'Your account',
    ]);
    const mentions = notifications.kind('Mentions and replies');
    await expect(mentions.about).toHaveText('Someone @mentions you or replies to you');
    await expect(mentions.sent).toHaveText('9,412');
    await expect(mentions.opened).toHaveText('61%');
    await expect(mentions.switch).toHaveAttribute('aria-checked', 'true');
    await expect(notifications.kind('Plan changes').about).toHaveText(
      'Stories added, moved or given to you',
    );
    await expect(notifications.kind('Stories due').switch).toBeVisible();

    const experiences = notifications.kind('Experiences');
    await expect(experiences.off).toHaveText('Off for everyone');
    await expect(experiences.about).toHaveText(
      'Off since 9 Jul by Lena Fischer: “Rating emails firing on every star change”',
    );
    await expect(experiences.sent).toHaveText('—');
    await expect(experiences.opened).toHaveText('—');
    await expect(experiences.switch).toHaveAttribute('aria-checked', 'false');

    const signIn = notifications.kind('Sign-in codes and security');
    await expect(signIn.required).toHaveText('Required');
    await expect(signIn.switch).toHaveCount(0);
  });

  // Given a phone, when "Kinds" shows, then each row keeps its name and switch and reads
  // "{sent} sent · {opened} opened" under the name (AC5).
  test('stacks each kind on a phone', async ({ page, pk }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await theMockNotifications(page);
    const notifications = new NotificationsPage(page);
    await pk.open('adminNotifications');

    const mentions = notifications.kind('Mentions and replies');
    await expect(mentions.row.locator('.kind-totals')).toHaveText('9,412 sent · 61% opened');
    await expect(mentions.sent).toBeHidden();
    await expect(mentions.switch).toBeVisible();
  });
});
