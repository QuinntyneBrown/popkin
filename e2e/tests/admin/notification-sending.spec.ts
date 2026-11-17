// Acceptance Test
// Traces to: L2-170 AC1, AC3, AC5, L2-169 AC3, L2-087 AC1, AC2, AC5, L2-086 AC2, AC3
// Description: an Owner pauses all member email with a reason and resumes it; a reason is asked
// for, a failure keeps it, and Support and Viewer admins see pausing switched off.
import { signedInAs } from '../../fixtures/admin';
import {
  pausedStatus,
  savesNotifications,
  theMockNotifications,
} from '../../fixtures/admin-notifications';
import { expect, test } from '../../fixtures/pk-test';
import { problem } from '../../fixtures/stubs';
import { AdminActionDialog } from '../../pages/admin/admin-dialogs';
import { NotificationsPage } from '../../pages/admin/notifications.page';

test.describe('Pause and resume member email (L2-170)', () => {
  // Given an Owner and email sending, when they choose "Pause all email", then the dialog says
  // what stops and what keeps sending, asks for a reason, and on confirming the status turns
  // coral and says who paused it and why (AC1, L2-169 AC3, L2-087 AC1).
  test('pauses all member email with a reason', async ({ page, pk }) => {
    const notifications = await theMockNotifications(page);
    const writes = await savesNotifications(page, notifications);
    const view = new NotificationsPage(page);
    const dialog = new AdminActionDialog(page, 'Pause all member email?', /Pause all email/);
    await pk.open('adminNotifications');

    await view.pause.click();
    await expect(dialog.description).toHaveText(
      'Every activity email and reminder stops within a minute and queues. Sign-in codes keep sending. Anything queued longer than 6 hours is dropped when you resume.',
    );
    await expect(dialog.reason).toBeFocused();
    await dialog.reason.fill('Digest sending twice.');
    await dialog.confirm.click();

    await expect(dialog.dialog).toHaveCount(0);
    expect(writes).toEqual([
      {
        method: 'POST',
        path: '/api/admin/notifications/pause',
        body: { reason: 'Digest sending twice.' },
      },
    ]);
    await expect(view.toast).toContainText('Member email paused');
    await expect(view.statusTitle).toHaveText('All member email is paused');
    await expect(view.statusText).toHaveText(
      '0 emails queued since 12:00, paused by Lena Fischer: “Digest sending twice.” Sign-in codes still go out.',
    );
    await expect(view.resume).toBeVisible();
  });

  // Given the reason is left empty, when the Owner confirms, then nothing is sent and the field
  // says why it is needed (L2-087 AC2).
  test('asks for a reason before pausing', async ({ page, pk }) => {
    const notifications = await theMockNotifications(page);
    const writes = await savesNotifications(page, notifications);
    const view = new NotificationsPage(page);
    const dialog = new AdminActionDialog(page, 'Pause all member email?', /Pause all email/);
    await pk.open('adminNotifications');

    await view.pause.click();
    await dialog.reason.fill('   ');
    await dialog.confirm.click();

    await expect(dialog.reasonField).toContainText('Give a reason; it goes in the audit log.');
    await expect(dialog.reason).toHaveAttribute('aria-invalid', 'true');
    expect(writes).toEqual([]);
  });

  // Given email is paused, when the Owner chooses "Resume sending", then the dialog says how many
  // queued emails send and about how long, and on confirming email is sending again (AC3).
  test('resumes sending with a reason', async ({ page, pk }) => {
    const notifications = await theMockNotifications(page, (n) => (n.status = pausedStatus()));
    const writes = await savesNotifications(page, notifications);
    const view = new NotificationsPage(page);
    const dialog = new AdminActionDialog(page, 'Resume sending?', /Resume sending/);
    await pk.open('adminNotificationsPaused');

    await view.resume.click();
    await expect(dialog.description).toHaveText(
      '3,240 queued emails send in order over about 6 minutes. Changes older than 6 hours are dropped rather than sent late.',
    );
    await dialog.reason.fill('Digest fixed in 3.4.2');
    await dialog.confirm.click();

    await expect(view.toast).toContainText('Sending resumed');
    await expect(view.statusTitle).toHaveText('Email is sending');
    expect(writes.map((w) => w.path)).toEqual(['/api/admin/notifications/resume']);
  });

  // Given the API fails, when the Owner confirms, then the dialog stays open saying nothing has
  // changed, with the reason as typed (L2-087 AC5).
  test('keeps the dialog and the reason when a pause fails', async ({ page, pk }) => {
    await theMockNotifications(page);
    await page.route('**/api/admin/notifications/pause', (route) => {
      const failed = problem(500, 'server_error');
      return route.fulfill({ status: failed.status, json: failed.body });
    });
    const view = new NotificationsPage(page);
    const dialog = new AdminActionDialog(page, 'Pause all member email?', /Pause all email/);
    await pk.open('adminNotifications');

    await view.pause.click();
    await dialog.reason.fill('Digest sending twice.');
    await dialog.confirm.click();

    await expect(dialog.alert).toContainText('That didn’t go through');
    await expect(dialog.reason).toHaveValue('Digest sending twice.');
    await expect(view.statusTitle).toHaveText('Email is sending');
  });

  // Given a Support or Viewer admin, when the status shows, then "Pause all email" is switched
  // off with its reason and opens nothing (AC5, L2-086 AC2, AC3).
  for (const [role, reason] of [
    ['Support', 'Only Owners can do this'],
    ['Viewer', 'Viewer admins can’t do this'],
  ] as const) {
    test(`switches pausing off for ${role}`, async ({ page, pk }) => {
      await theMockNotifications(page);
      await signedInAs(page, role);
      const view = new NotificationsPage(page);
      await pk.open('adminNotifications');

      await expect(view.pause).toHaveAttribute('aria-disabled', 'true');
      await expect(view.pause).toHaveAttribute('title', reason);
      await view.pause.click({ force: true });
      await expect(page.getByRole('dialog')).toHaveCount(0);
    });
  }
});
