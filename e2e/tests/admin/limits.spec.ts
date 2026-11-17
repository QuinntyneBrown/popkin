// Acceptance Test
// Traces to: L2-176 AC3, L2-117 AC1, L2-089 AC1, AC7
// Description: any admin opens Limits from the sidebar and reads how long a sign-in lasts, with
// its default beside it; a failed load says so and offers "Try again".
import { atTheRecording } from '../../fixtures/admin';
import { expect, test } from '../../fixtures/pk-test';
import { AdminShell } from '../../pages/admin/admin-shell';
import { LimitsPage } from '../../pages/admin/limits.page';

test.describe('Limits: how long a sign-in lasts (L2-176)', () => {
  test.beforeEach(({ page }) => atTheRecording(page));

  // Given an admin in the console, when they choose "Limits", then the page opens with the panel
  // "Sessions" and "Sign-in lasts" at 365 days, its default beside it (AC3).
  test('shows the sign-in length with its default', async ({ page, pk }) => {
    const shell = new AdminShell(page);
    const view = new LimitsPage(page);
    await pk.open('adminAudit');

    await shell.nav.getByRole('link', { name: 'Limits' }).click();

    await expect(view.root).toBeVisible();
    await expect(shell.current).toHaveText('Limits');
    await expect(view.heading).toHaveText('Limits');
    await expect(view.sub).toHaveText('Changes apply to every person within a minute of saving.');
    await expect(view.panels).toHaveText(['Sessions']);
    await expect(view.sessionsSub).toHaveText(
      'How long a person stays signed in on a device they keep using.',
    );
    await expect(view.signInName).toHaveText('Sign-in lasts');
    await expect(view.signInHelp).toHaveText(
      'Days since the person last used Popkin on the device · default 365 days',
    );
    await expect(view.signInLasts).toHaveValue('365');
    await expect(view.signInLasts).toHaveAttribute('inputmode', 'numeric');
    await expect(view.signInUnit).toHaveText('days');
    await expect(view.saveBar).toHaveCount(0);
  });

  // Given the admin API does not answer, when Limits opens, then it says so and "Try again" reads
  // the limits again (L2-089 AC7).
  test('says when the limits could not be loaded and tries again', async ({ page, pk }) => {
    let failing = true;
    await page.route('**/api/admin/limits', (route) =>
      failing ? route.fulfill({ status: 503 }) : route.fallback(),
    );
    const view = new LimitsPage(page);
    await pk.open('adminLimits');

    await expect(view.empty).toContainText('Couldn’t load the limits');
    failing = false;
    await view.tryAgain.click();

    await expect(view.signInLasts).toHaveValue('365');
  });
});
