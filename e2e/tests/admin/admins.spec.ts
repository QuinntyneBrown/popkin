import { atTheRecording, recordedAdmins, signedInAs } from '../../fixtures/admin';
import { expect, test } from '../../fixtures/pk-test';
import { answer, answerOnce, hold, problem } from '../../fixtures/stubs';
import { AddAdminDialog, AdminActionDialog } from '../../pages/admin/admin-dialogs';
import { AdminsPage } from '../../pages/admin/admins.page';

const priya = {
  id: '00000000-0000-4000-a000-0000000000a1',
  name: 'Priya R',
  email: 'priya.r@popkin.app',
  role: 'Support',
  invited: true,
  lastActiveAt: null,
  isYou: false,
  isLastOwner: false,
};

test.describe('Admins & roles (L2-119)', () => {
  test.use({ timezoneId: 'Europe/London' });
  test.beforeEach(({ page }) => atTheRecording(page));

  // Given an Owner, when they open Admins & roles, then everyone who can sign in is listed, them
  // first, each with their role, when they were last active, and Remove (L2-119 AC1, AC4).
  test('lists who can sign in to the console', async ({ page, pk }) => {
    const admins = new AdminsPage(page);

    await pk.open('adminAdmins');

    await expect(admins.root).toBeVisible();
    await expect(admins.heading).toHaveText('Admins & roles');
    await expect(admins.sub).toHaveText('4 people can sign in to this console');
    await expect(admins.adminsTab).toHaveAccessibleName('Admins 4');
    await expect(admins.rows).toHaveCount(4);
    await expect(admins.rows.first()).toContainText('Lena Fischer');
    await expect(admins.rows.first()).toContainText('You');
    // An Owner cannot change their own role or remove themselves (L2-119 AC7).
    await expect(admins.role('Lena Fischer')).toHaveCount(0);
    await expect(admins.remove('Lena Fischer')).toHaveCount(0);
    await expect(admins.row('Aiko Tanaka')).toContainText('Invited · not signed in yet');
    await expect(admins.role('Aiko Tanaka')).toHaveValue('Support');
    await expect(admins.remove('Marco Bianchi')).toBeEnabled();
    await expect(admins.shell.current).toHaveText('Admins & roles');
  });

  // Given an Owner, when they add priya.r@popkin.app as Support, then she is listed as invited
  // and the toast says her invite went (L2-119 AC2, AC4).
  test('adds an admin, who is invited until they sign in', async ({ page, pk }) => {
    const admins = new AdminsPage(page);
    const add = new AddAdminDialog(page);
    await answer(page, 'POST /api/admin/admins', { status: 201, body: priya });
    await pk.open('adminAdmins');

    await admins.addAdmin.click();
    await expect(add.panel).toBeVisible();
    await expect(add.email).toBeFocused();
    await expect(add.role('Support')).toHaveAttribute('aria-checked', 'true');
    await add.email.fill('priya.r@popkin.app');
    await add.sendInvite.click();

    await expect(add.dialog).toBeHidden();
    await expect(admins.row('Priya R')).toContainText('Invited · not signed in yet');
    await expect(admins.sub).toHaveText('5 people can sign in to this console');
    await expect(admins.toast).toContainText('Invite sent to priya.r@popkin.app');
    await expect(admins.toast).toContainText(
      'They’re a Support admin once they sign in with a code.',
    );
    await expect(admins.addAdmin).toBeFocused();
  });

  // Given an address outside @popkin.app, or one already an admin's, then the field says so
  // and nothing is added; when the invite can't be sent, the dialog says nothing changed
  // (L2-119 AC3).
  test('refuses an address that cannot be an admin', async ({ page, pk }) => {
    const admins = new AdminsPage(page);
    const add = new AddAdminDialog(page);
    await pk.open('adminAdmins');
    await admins.addAdmin.click();

    await add.email.fill('priya.r@gmail.com');
    await add.sendInvite.click();
    await expect(add.emailError).toHaveText(
      'Use a @popkin.app address. Only Popkin staff can be admins.',
    );

    await answer(page, 'POST /api/admin/admins', problem(400, 'admin_exists', { field: 'email' }));
    await add.email.fill('aiko.tanaka@popkin.app');
    await add.sendInvite.click();
    await expect(add.emailError).toHaveText('Aiko Tanaka is already an admin.');

    await answer(page, 'POST /api/admin/admins', problem(503, 'invite_not_sent'));
    await add.email.fill('priya.r@popkin.app');
    await add.sendInvite.click();
    await expect(add.alert).toContainText('We couldn’t send the invite.');
    await expect(add.alert).toContainText('Nothing changed. Try again.');
    await expect(add.email).toHaveValue('priya.r@popkin.app');
  });

  // Given an Owner, when they choose Viewer for Aiko and give a reason, then her row says Viewer
  // (L2-119 AC5, L2-087 AC3); "Cancel" leaves her role as it was.
  test('changes an admin’s role, with a reason for the log', async ({ page, pk }) => {
    const admins = new AdminsPage(page);
    const change = new AdminActionDialog(
      page,
      'Make Aiko Tanaka a Viewer?',
      /Change role|Changing/,
    );
    await pk.open('adminAdmins');

    await admins.role('Aiko Tanaka').selectOption('Viewer');
    await expect(change.description).toHaveText(
      'Aiko can still look at everything but can no longer help people, moderate or end calls. It applies the next time they open a page.',
    );
    await expect(change.reason).toBeFocused();
    await change.cancel.click();
    await expect(change.dialog).toBeHidden();
    await expect(admins.role('Aiko Tanaka')).toHaveValue('Support');

    await admins.role('Aiko Tanaka').selectOption('Viewer');
    await change.reason.fill('Moved to finance');
    const release = await hold(page, `PUT /api/admin/admins/${aikoId()}/role`);
    await change.confirm.click();
    await expect(change.confirm).toHaveText('Changing…');
    release();

    await expect(change.dialog).toBeHidden();
    await expect(admins.role('Aiko Tanaka')).toHaveValue('Viewer');
  });

  // Given the last Owner, when another Owner is demoted at the same moment, then the dialog says
  // the console needs an Owner and nothing changes (L2-119 AC8).
  test('keeps the last Owner', async ({ page, pk }) => {
    const admins = new AdminsPage(page);
    const change = new AdminActionDialog(page, 'Make Aiko Tanaka a Viewer?', /Change role/);
    await answer(page, `PUT /api/admin/admins/${aikoId()}/role`, problem(409, 'last_owner'));
    await pk.open('adminAdmins');

    await admins.role('Aiko Tanaka').selectOption('Viewer');
    await change.confirm.click();

    await expect(change.alert).toContainText('The console needs at least one Owner.');
    await expect(change.panel).toBeVisible();
  });

  // Given an Owner, when they remove Marco, then he leaves the list and the toast says his
  // actions stay in the log (L2-119 AC6).
  test('removes an admin', async ({ page, pk }) => {
    const admins = new AdminsPage(page);
    const remove = new AdminActionDialog(page, 'Remove Marco Bianchi?', /Remove admin|Removing/);
    await pk.open('adminAdmins');

    await admins.remove('Marco Bianchi').click();
    await expect(remove.description).toHaveText(
      'They’re signed out of the console now and can’t sign back in. Their past actions stay in the audit log. They were a Viewer.',
    );
    await remove.confirm.click();

    await expect(remove.dialog).toBeHidden();
    await expect(admins.row('Marco Bianchi')).toHaveCount(0);
    await expect(admins.sub).toHaveText('3 people can sign in to this console');
    await expect(admins.toast).toContainText('Marco Bianchi removed');
  });

  // Given a Viewer, when they open Admins & roles, then they see everyone but every change is
  // switched off and says why (L2-086 AC2, AC3).
  test('shows a Viewer the admins, with every change switched off', async ({ page, pk }) => {
    const admins = new AdminsPage(page);
    await signedInAs(page, 'Viewer');

    await pk.open('adminAdmins');

    await expect(admins.shell.notice).toHaveText(
      'You’re signed in as a Viewer. You can look at everything; actions are switched off.',
    );
    await expect(admins.role('Aiko Tanaka')).toHaveCount(0);
    await expect(admins.row('Aiko Tanaka')).toContainText('Support');
    await expect(admins.remove('Marco Bianchi')).toBeDisabled();
    await expect(admins.remove('Marco Bianchi')).toHaveAttribute(
      'title',
      'Viewer admins can’t do this',
    );
    await expect(admins.addAdmin).toBeDisabled();
    // It stays focusable, and choosing it opens nothing (L2-086 AC2).
    await admins.addAdmin.focus();
    await expect(admins.addAdmin).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  // Given a Support admin, then the reason says only Owners can (L2-086 AC2).
  test('tells a Support admin only Owners manage admins', async ({ page, pk }) => {
    const admins = new AdminsPage(page);
    await signedInAs(page, 'Support');

    await pk.open('adminAdmins');

    await expect(admins.shell.notice).toBeHidden();
    await expect(admins.addAdmin).toHaveAttribute('title', 'Only Owners can do this');
  });

  // Given any admin, "What each role can do" shows each role's actions, the notification rows
  // among them, a word in every cell as well as the mark (L2-086 AC4).
  test('shows what each role can do', async ({ page, pk }) => {
    const admins = new AdminsPage(page);
    await pk.open('adminAdmins');

    await admins.rolesTab.click();

    await expect(page).toHaveURL(/view=roles/);
    await expect(admins.permissions).toBeVisible();
    await expect(admins.permissions.locator('thead')).toContainText('Owner1 admin');
    await expect(admins.permissions.locator('thead')).toContainText('Support2 admins');
    const deletion = admins.permissions.getByRole('row', { name: /Start account deletion/ });
    await expect(deletion.getByRole('cell')).toHaveText([
      /^Allowed$/,
      /Not allowed$/,
      /Not allowed$/,
    ]);
    const holds = admins.permissions.getByRole('row', { name: /Hold and release notifications/ });
    await expect(holds.getByRole('cell')).toHaveText([/^Allowed$/, /^Allowed$/, /Not allowed$/]);
    const notifications = admins.permissions.getByRole('row', {
      name: /Pause email, switch kinds and change defaults/,
    });
    await expect(notifications.getByRole('cell')).toHaveText([
      /^Allowed$/,
      /Not allowed$/,
      /Not allowed$/,
    ]);
  });

  // Given the list fails, then the page says so and "Try again" reads it again (L2-089 AC7).
  test('says when the admins could not be read', async ({ page, pk }) => {
    const admins = new AdminsPage(page);
    await answerOnce(page, 'GET /api/admin/admins', problem(500, 'server_error'));
    await pk.open('adminAdmins');

    await expect(admins.empty).toContainText('Couldn’t load the admins');
    await admins.tryAgain.click();
    await expect(admins.rows).toHaveCount(4);
  });
});

function aikoId(): string {
  return recordedAdmins.find((admin) => admin.name === 'Aiko Tanaka')!.id;
}
