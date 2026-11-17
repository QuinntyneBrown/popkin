import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { atTheRecording, signedOutOfTheConsole } from '../../../e2e/fixtures/admin';
import { type Pk, test } from '../../../e2e/fixtures/pk-test';
import type { RouteKey } from '../../../e2e/fixtures/routes';
import { answer } from '../../../e2e/fixtures/stubs';
import { AddAdminDialog, AdminActionDialog } from '../../../e2e/pages/admin/admin-dialogs';
import { AdminsPage } from '../../../e2e/pages/admin/admins.page';
import { AuditPage } from '../../../e2e/pages/admin/audit.page';
import { AdminSignInPage } from '../../../e2e/pages/admin/sign-in.page';
import { detail, frame, shot, type Size, type Theme } from '../../../tools/video-record/shots';

/**
 * The screenshots of video 24: journey 24, Open the admin app, in the running admin app on :4202.
 * Lena Fischer is the recording's Owner. Every /api request is answered in memory by the fixtures
 * of `e2e/` or the recording (ADR 0005); no backend and no database ran. Not a test and not a
 * sweep: only `node tools/video-record/record.mjs docs/videos/24-journey-24-open-the-admin-app`
 * runs it.
 */

test.use({ timezoneId: 'Europe/London' });

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

async function open(page: Page, pk: Pk, key: RouteKey, size: Size, theme: Theme = 'light') {
  await frame(page, size, theme);
  await atTheRecording(page);
  await pk.open(key);
  await page.waitForLoadState('networkidle');
}

const blur = (page: Page) =>
  page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

for (const size of ['XS', 'XL'] as const) {
  test(`signing in at ${size}`, async ({ page, pk }) => {
    await frame(page, size);
    await atTheRecording(page);
    await signedOutOfTheConsole(page);
    const signIn = new AdminSignInPage(page);
    await pk.open('adminAudit');
    await expect(signIn.heading).toHaveText('Sign in to the console');
    await signIn.email.fill('lena@popkin.app');
    await blur(page);
    await shot(page, `sign-in-${size.toLowerCase()}`);
    await signIn.sendCode.click();
    await expect(signIn.heading).toHaveText('Enter your code');
    await blur(page);
    await shot(page, `code-${size.toLowerCase()}`);
    if (size === 'XS') await detail(signIn.lead, 'code-sent', 12);
    await signIn.code.fill('482913');
    await expect(new AuditPage(page).root).toBeVisible();
    await page.waitForLoadState('networkidle');
    await shot(page, `audit-after-sign-in-${size.toLowerCase()}`);
  });
}

for (const size of ['XS', 'M', 'L', 'XL'] as const) {
  test(`the audit log at ${size}`, async ({ page, pk }) => {
    await open(page, pk, 'adminAudit', size);
    const audit = new AuditPage(page);
    await expect(audit.rows).toHaveCount(4);
    await shot(page, `audit-${size.toLowerCase()}`);
    if (size === 'XL') {
      await detail(audit.rows.first(), 'audit-row', 12);
      await detail(audit.shell.me, 'me', 12);
    }
  });
}

test('the audit log in the dark', async ({ page, pk }) => {
  await open(page, pk, 'adminAudit', 'XL', 'dark');
  await shot(page, 'audit-xl-dark');
});

test('admins and roles', async ({ page, pk }) => {
  await open(page, pk, 'adminAdmins', 'XL');
  const admins = new AdminsPage(page);
  await expect(admins.heading).toBeVisible();
  await shot(page, 'admins-xl');
  await detail(admins.table, 'admins-table', 12);
  await admins.rolesTab.click();
  await expect(admins.permissions).toBeVisible();
  await shot(page, 'roles-xl');
  await open(page, pk, 'adminAdmins', 'XS');
  await shot(page, 'admins-xs');
});

test('adding an admin', async ({ page, pk }) => {
  await answer(page, 'POST /api/admin/admins', { status: 201, body: priya });
  await open(page, pk, 'adminAdmins', 'XL');
  const admins = new AdminsPage(page);
  const add = new AddAdminDialog(page);
  await admins.addAdmin.click();
  await add.email.fill('priya.r@popkin.app');
  await blur(page);
  await shot(page, 'add-admin-xl');
  await detail(add.panel, 'add-admin', 12);
  await add.sendInvite.click();
  await expect(admins.row('Priya R')).toContainText('Invited · not signed in yet');
  await shot(page, 'invited-xl');
  await detail(admins.row('Priya R'), 'invited-row', 12);
});

test('changing a role', async ({ page, pk }) => {
  await open(page, pk, 'adminAdmins', 'XL');
  const admins = new AdminsPage(page);
  const change = new AdminActionDialog(page, 'Make Aiko Tanaka a Viewer?', /Change role|Changing/);
  await admins.role('Aiko Tanaka').selectOption('Viewer');
  await expect(change.reason).toBeFocused();
  await change.reason.fill('Moving to the finance team');
  await blur(page);
  await shot(page, 'change-role-xl');
  await detail(change.panel, 'change-role', 12);
});
