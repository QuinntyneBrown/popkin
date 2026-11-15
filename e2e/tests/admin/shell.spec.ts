import { atTheRecording } from '../../fixtures/admin';
import { expect, test } from '../../fixtures/pk-test';
import { AdminShell } from '../../pages/admin/admin-shell';
import { AdminErrorPage } from '../../pages/admin/error-pages';
import { AdminMenuDialog } from '../../pages/admin/menu.dialog';

test.describe('the console’s frame (L2-089)', () => {
  test.beforeEach(({ page }) => atTheRecording(page));

  // Given a phone, when the admin opens the menu, then every section is in a drawer that holds
  // focus; Escape closes it and gives focus back to "Open menu" (L2-089 AC2).
  test('opens the sections in a drawer on a phone', async ({ page, pk }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    const shell = new AdminShell(page);
    const menu = new AdminMenuDialog(page);
    await pk.open('adminAudit');

    await shell.openMenu.click();
    await expect(menu.nav).toBeVisible();
    await expect(menu.current).toHaveText('Audit log');
    await expect(menu.drawer.locator(':focus')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(menu.drawer).toHaveCount(0);
    await expect(shell.openMenu).toBeFocused();

    await shell.openMenu.click();
    await menu.section('Admins & roles').click();
    await expect(page).toHaveURL(/\/admins$/);
    await expect(menu.drawer).toHaveCount(0);
  });

  // Given an address the console has no page for, then it says so and leads to the dashboard
  // (L2-089 AC5).
  test('says there is no page at an unknown address', async ({ page, pk }) => {
    const notFound = new AdminErrorPage(page, 'not-found');

    await pk.open('adminNotFound');

    await expect(notFound.root).toBeVisible();
    await expect(notFound.heading).toHaveText('There’s no page here');
    await expect(notFound.code).toHaveText('Error 404');
    await notFound.goToDashboard.click();
    await expect(page).toHaveURL(/\/audit$/);
  });

  // Given the server-error screen opened on its own, then "Try again" opens the dashboard and
  // "Open Health" is offered (L2-089 AC6).
  test('says when something went wrong on Popkin’s side', async ({ page, pk }) => {
    const error = new AdminErrorPage(page, 'server-error');

    await pk.open('adminServerError');

    await expect(error.heading).toHaveText('Something went wrong on our side');
    await expect(error.code).toHaveText('Error 500');
    await expect(error.tryAgain).toHaveAttribute('href', '/');
    await expect(error.openHealth).toHaveAttribute('href', '/health');
  });
});
