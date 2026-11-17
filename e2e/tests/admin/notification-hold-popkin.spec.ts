// Acceptance Test
// Traces to: L2-172 AC2, AC7, L2-087 AC1, AC2, AC5
// Description: an Owner or Support admin chooses "Hold a Popkin", searches active Popkins not
// already held by name or code, picks one, gives a reason and holds it; a Viewer cannot.
import { signedInAs } from '../../fixtures/admin';
import { savesHolds, theMockHolds } from '../../fixtures/admin-notifications';
import { expect, test } from '../../fixtures/pk-test';
import { problem } from '../../fixtures/stubs';
import { AdminActionDialog } from '../../pages/admin/admin-dialogs';
import { NotificationsPage } from '../../pages/admin/notifications.page';

test.describe('Hold a Popkin (L2-172)', () => {
  // Given an Owner, when they choose "Hold a Popkin", then a popover lists the active Popkins not
  // held, with focus in "Name or code", and typing narrows the list by name or code (AC2).
  test('searches the Popkins that can be held', async ({ page, pk }) => {
    await theMockHolds(page);
    const view = new NotificationsPage(page);
    await pk.open('adminNotificationsHolds');

    await view.holdAPopkin.click();
    await expect(view.holdAPopkin).toHaveAttribute('aria-expanded', 'true');
    await expect(view.holdSearch).toBeFocused();
    await expect(view.holdMatches).toHaveCount(5);

    await view.holdSearch.fill('brunch');
    await expect(view.holdMatches).toHaveText([/Sunday Brunch Club/]);
    await view.holdSearch.fill('PINE-4821');
    await expect(view.holdMatches).toHaveText([/Lakeside Weekend\s*PINE-4821/]);
    await view.holdSearch.fill('zzz');
    await expect(view.holdMatches).toHaveCount(0);
    await expect(view.holdNotes).toHaveText(
      'No active Popkin matches “zzz”. Wrapped-up and held Popkins aren’t listed.',
    );
  });

  // Given the popover, when the admin presses Escape, then it closes and focus is back on the
  // button; ArrowDown from the search reaches the first match.
  test('works by keyboard and closes with Escape', async ({ page, pk }) => {
    await theMockHolds(page);
    const view = new NotificationsPage(page);
    await pk.open('adminNotificationsHolds');

    await view.holdAPopkin.click();
    await expect(view.holdMatches).toHaveCount(5);
    await page.keyboard.press('ArrowDown');
    await expect(view.holdMatch('Bakery Launch Crew')).toBeFocused();
    await page.keyboard.press('Escape');

    await expect(view.holdPopover).toHaveCount(0);
    await expect(view.holdAPopkin).toBeFocused();
    await expect(view.holdAPopkin).toHaveAttribute('aria-expanded', 'false');
  });

  // Given a match, when the Owner picks it, gives a reason and confirms, then the hold is added
  // first, the tab counts it and a toast says so (AC2, L2-087 AC1).
  test('holds a Popkin with a reason', async ({ page, pk }) => {
    const mock = await theMockHolds(page);
    const writes = await savesHolds(page, mock);
    const view = new NotificationsPage(page);
    const dialog = new AdminActionDialog(page, 'Hold Bakery Launch Crew?', /^Hold$/);
    await pk.open('adminNotificationsHolds');

    await view.holdAPopkin.click();
    await view.holdMatch('Bakery Launch Crew').click();
    await expect(view.holdPopover).toHaveCount(0);
    await expect(dialog.description).toHaveText(
      'Its members get no email or phone alerts from it until it is released. They aren’t told.',
    );
    await expect(dialog.reason).toBeFocused();
    await dialog.reason.fill('Spam invites from a new account');
    await dialog.confirm.click();

    await expect(dialog.dialog).toHaveCount(0);
    expect(writes).toEqual([
      {
        method: 'POST',
        path: '/api/admin/notifications/holds',
        body: { popkinId: 'popkin-bakery', reason: 'Spam invites from a new account' },
      },
    ]);
    await expect(view.toast).toContainText('Bakery Launch Crew is held');
    await expect(view.holdRows.first().locator('.who__name')).toHaveText('Bakery Launch Crew');
    const bakery = view.hold('Bakery Launch Crew');
    await expect(bakery.why).toContainText('Spam invites from a new account');
    await expect(bakery.by).toHaveText('Lena Fischer · Tue 14 Jul');
    await expect(view.tab('Holds')).toHaveAccessibleName('Holds 5');
  });

  // Given the reason is left empty, when the admin confirms, then nothing is sent (L2-087 AC2).
  test('asks for a reason before holding', async ({ page, pk }) => {
    const mock = await theMockHolds(page);
    const writes = await savesHolds(page, mock);
    const view = new NotificationsPage(page);
    const dialog = new AdminActionDialog(page, 'Hold Bakery Launch Crew?', /^Hold$/);
    await pk.open('adminNotificationsHolds');

    await view.holdAPopkin.click();
    await view.holdMatch('Bakery Launch Crew').click();
    await dialog.confirm.click();

    await expect(dialog.reasonField).toContainText('Give a reason; it goes in the audit log.');
    expect(writes).toEqual([]);
  });

  // Given the API refuses, when the admin confirms, then the dialog stays with the reason as
  // typed and the list is unchanged (L2-087 AC5).
  test('keeps the dialog when the hold fails', async ({ page, pk }) => {
    await theMockHolds(page);
    await page.route('**/api/admin/notifications/holds', (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      const failed = problem(409, 'popkin_already_held');
      return route.fulfill({ status: failed.status, json: failed.body });
    });
    const view = new NotificationsPage(page);
    const dialog = new AdminActionDialog(page, 'Hold Bakery Launch Crew?', /^Hold$/);
    await pk.open('adminNotificationsHolds');

    await view.holdAPopkin.click();
    await view.holdMatch('Bakery Launch Crew').click();
    await dialog.reason.fill('Spam invites');
    await dialog.confirm.click();

    await expect(dialog.alert).toContainText('That didn’t go through');
    await expect(dialog.reason).toHaveValue('Spam invites');
    await expect(view.holdRows).toHaveCount(4);
  });

  // Given a Support admin, then holding is open to them; given a Viewer, then "Hold a Popkin" is
  // switched off with its reason and opens nothing (AC7, L2-086).
  test('lets Support hold a Popkin', async ({ page, pk }) => {
    await theMockHolds(page);
    await signedInAs(page, 'Support');
    const view = new NotificationsPage(page);
    await pk.open('adminNotificationsHolds');

    await expect(view.holdAPopkin).not.toHaveAttribute('aria-disabled', 'true');
    await view.holdAPopkin.click();
    await expect(view.holdPopover).toBeVisible();
  });

  test('switches holding off for a Viewer', async ({ page, pk }) => {
    await theMockHolds(page);
    await signedInAs(page, 'Viewer');
    const view = new NotificationsPage(page);
    await pk.open('adminNotificationsHolds');

    await expect(view.holdAPopkin).toHaveAttribute('aria-disabled', 'true');
    await expect(view.holdAPopkin).toHaveAttribute('title', 'Viewer admins can’t do this');
    await view.holdAPopkin.click({ force: true });
    await expect(view.holdPopover).toHaveCount(0);
  });
});
