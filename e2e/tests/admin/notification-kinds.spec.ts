// Acceptance Test
// Traces to: L2-171 AC1–AC3, AC5, L2-087 AC1, AC5, L2-154 AC2
// Description: an Owner switches a kind off for everyone with a reason and back on; the switch
// goes back when the dialog is cancelled; Support and Viewer admins see every switch switched off.
import { signedInAs } from '../../fixtures/admin';
import { savesNotifications, theMockNotifications } from '../../fixtures/admin-notifications';
import { expect, test } from '../../fixtures/pk-test';
import { problem } from '../../fixtures/stubs';
import { AdminActionDialog } from '../../pages/admin/admin-dialogs';
import { NotificationsPage } from '../../pages/admin/notifications.page';

test.describe('A kind off for everyone (L2-171)', () => {
  // Given an Owner turns a kind's switch off, when the dialog opens, then it says what it does and
  // asks for a reason; on confirming the row reads "Off for everyone", "—" and why (AC1, AC2).
  test('turns a kind off for everyone with a reason', async ({ page, pk }) => {
    const notifications = await theMockNotifications(page);
    const writes = await savesNotifications(page, notifications);
    const view = new NotificationsPage(page);
    const dialog = new AdminActionDialog(
      page,
      'Turn new photos off for everyone?',
      /Turn off for everyone/,
    );
    await pk.open('adminNotifications');

    const photos = view.kind('New photos');
    await photos.switch.click();
    await expect(dialog.description).toHaveText(
      'No member gets new photos by email or phone, whatever their settings. Their own choices are kept and come back when you switch it on.',
    );
    await expect(dialog.reason).toBeFocused();
    await dialog.reason.fill('Photo emails firing twice');
    await dialog.confirm.click();

    await expect(dialog.dialog).toHaveCount(0);
    expect(writes).toEqual([
      {
        method: 'PUT',
        path: '/api/admin/notifications/kinds/NewPhotos',
        body: { on: false, reason: 'Photo emails firing twice' },
      },
    ]);
    await expect(view.toast).toContainText('New photos is off for everyone');
    await expect(photos.off).toHaveText('Off for everyone');
    await expect(photos.about).toHaveText(
      'Off since 14 Jul by Lena Fischer: “Photo emails firing twice”',
    );
    await expect(photos.sent).toHaveText('—');
    await expect(photos.switch).toHaveAttribute('aria-checked', 'false');
  });

  // Given an Owner turns a kind back on, when "Turn {kind} back on?" is confirmed, then the row
  // reads what sends it again, with its switch on (AC3).
  test('turns a kind back on', async ({ page, pk }) => {
    const notifications = await theMockNotifications(page);
    const writes = await savesNotifications(page, notifications);
    const view = new NotificationsPage(page);
    const dialog = new AdminActionDialog(page, 'Turn experiences back on?', /^Turn on$/);
    await pk.open('adminNotifications');

    const experiences = view.kind('Experiences');
    await experiences.switch.click();
    await expect(dialog.description).toHaveText(
      'Experiences start sending again from the next change, to members who have them on.',
    );
    await dialog.reason.fill('Rating emails fixed in 3.4.2');
    await dialog.confirm.click();

    await expect(view.toast).toContainText('Experiences is back on');
    await expect(experiences.off).toHaveCount(0);
    await expect(experiences.about).toHaveText('New places, ratings and comments');
    await expect(experiences.switch).toHaveAttribute('aria-checked', 'true');
    expect(writes[0].body).toEqual({ on: true, reason: 'Rating emails fixed in 3.4.2' });
  });

  // Given the dialog is cancelled, when it closes, then nothing is sent and the switch is back
  // as it was (the design: a switch goes back until its dialog confirms).
  test('puts the switch back when the dialog is cancelled', async ({ page, pk }) => {
    const notifications = await theMockNotifications(page);
    const writes = await savesNotifications(page, notifications);
    const view = new NotificationsPage(page);
    const dialog = new AdminActionDialog(page, 'Turn group chat off for everyone?', /Turn off/);
    await pk.open('adminNotifications');

    const chat = view.kind('Group chat');
    await chat.switch.click();
    await dialog.dialog.getByRole('button', { name: 'Keep it on' }).click();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(chat.switch).toHaveAttribute('aria-checked', 'true');
    expect(writes).toEqual([]);
  });

  // Given the API fails, when the Owner confirms, then the dialog stays open with the reason as
  // typed, and the row is unchanged (L2-087 AC5).
  test('keeps the dialog and the reason when a switch fails', async ({ page, pk }) => {
    await theMockNotifications(page);
    await page.route('**/api/admin/notifications/kinds/NewPhotos', (route) => {
      const failed = problem(500, 'server_error');
      return route.fulfill({ status: failed.status, json: failed.body });
    });
    const view = new NotificationsPage(page);
    const dialog = new AdminActionDialog(page, 'Turn new photos off for everyone?', /Turn off/);
    await pk.open('adminNotifications');

    await view.kind('New photos').switch.click();
    await dialog.reason.fill('Photo emails firing twice');
    await dialog.confirm.click();

    await expect(dialog.alert).toContainText('That didn’t go through');
    await expect(dialog.reason).toHaveValue('Photo emails firing twice');
  });

  // Given a Support or Viewer admin, when Kinds shows, then every switch is switched off with its
  // reason and turning one opens nothing (AC5).
  for (const [role, reason] of [
    ['Support', 'Only Owners can do this'],
    ['Viewer', 'Viewer admins can’t do this'],
  ] as const) {
    test(`switches every kind's switch off for ${role}`, async ({ page, pk }) => {
      await theMockNotifications(page);
      await signedInAs(page, role);
      const view = new NotificationsPage(page);
      await pk.open('adminNotifications');

      const photos = view.kind('New photos');
      await expect(photos.switch).toHaveAttribute('aria-disabled', 'true');
      await expect(photos.switch).toHaveAttribute('title', reason);
      await photos.switch.click({ force: true });
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(photos.switch).toHaveAttribute('aria-checked', 'true');
    });
  }
});
