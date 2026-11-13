import { expect, test } from '../fixtures/pk-test';
import { answer, hold, problem } from '../fixtures/stubs';
import { AccountPage } from '../pages/account.page';
import { SignOutDialog } from '../pages/sign-out.dialog';
import { WelcomePage } from '../pages/welcome.page';

test.describe('signing out', () => {
  // L2-048 AC5
  test('asks first, with the focus on staying signed in', async ({ page, pk }) => {
    await pk.open('account');
    const account = new AccountPage(page);

    await account.signOut.click();
    const dialog = new SignOutDialog(page);

    await expect(dialog.panel).toBeVisible();
    await expect(dialog.description).toHaveText(
      'You’ll need a new code to sign back in on this device.',
    );
    await expect(dialog.stay).toBeFocused();
    await expect(dialog.stay).toHaveText('Stay signed in');
    await expect(dialog.signOut).toHaveText('Sign out');
  });

  // L2-048 AC5
  test('"Stay signed in" closes it and gives the focus back', async ({ page, pk }) => {
    await pk.open('account');
    const account = new AccountPage(page);
    await account.signOut.click();

    await new SignOutDialog(page).stay.click();

    await expect(new SignOutDialog(page).root).toHaveCount(0);
    await expect(account.signOut).toBeFocused();
  });

  // L2-048 AC5, L2-050 AC3
  test('confirming ends the session on this device and opens the welcome screen', async ({
    page,
    pk,
  }) => {
    const release = await hold(page, 'POST /api/auth/sign-out');
    await pk.open('account');
    await new AccountPage(page).signOut.click();
    const dialog = new SignOutDialog(page);

    await dialog.signOut.click();

    await expect(dialog.signOut).toHaveText('Signing out…');
    await expect(dialog.signOut).toBeDisabled();
    release();
    await expect(page).toHaveURL('/welcome');
    await expect(new WelcomePage(page).root).toBeVisible();
    // Nothing of the person stays on the device: the saved list of My Popkins is gone (L2-054).
    expect(await page.evaluate(() => localStorage.getItem('popkin.my-popkins'))).toBeNull();
  });

  // L2-048 AC5: the welcome screen opens at its top
  test('on a phone the welcome screen opens at its top', async ({ page, pk }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await pk.open('account');
    await new AccountPage(page).signOut.click();

    await new SignOutDialog(page).signOut.click();

    await expect(new WelcomePage(page).root).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });

  // L2-048 AC5: the session had already ended
  test('a session that had already ended still opens the welcome screen', async ({ page, pk }) => {
    await answer(page, 'POST /api/auth/sign-out', { status: 401 });
    await pk.open('account');
    await new AccountPage(page).signOut.click();

    await new SignOutDialog(page).signOut.click();

    await expect(page).toHaveURL('/welcome');
  });

  test('a sign out that fails keeps the person signed in and says so', async ({ page, pk }) => {
    await answer(page, 'POST /api/auth/sign-out', problem(500, 'unexpected'));
    await pk.open('account');
    await new AccountPage(page).signOut.click();
    const dialog = new SignOutDialog(page);

    await dialog.signOut.click();

    await expect(dialog.failed).toContainText('We couldn’t sign you out.');
    await expect(dialog.signOut).toBeEnabled();
    await expect(page).toHaveURL('/account');
  });
});
