import { hostingNothing, hostingTwoPopkins, theMockAccount } from '../fixtures/account';
import { expect, test } from '../fixtures/pk-test';
import { answer, hold, problem } from '../fixtures/stubs';
import { AccountPage } from '../pages/account.page';
import { DeleteAccountDialog } from '../pages/delete-account.dialog';
import { LandingPage } from '../pages/landing.page';
import { Toasts } from '../pages/toasts';

test.describe('deleting the account', () => {
  test.beforeEach(async ({ page }) => {
    await theMockAccount(page);
  });

  // L2-049 AC1, AC3
  test('says what is removed, what stays without the name, and which Popkins wrap up', async ({
    page,
    pk,
  }) => {
    await hostingTwoPopkins(page);
    await pk.open('account');

    await new AccountPage(page).deleteAccount.click();
    const dialog = new DeleteAccountDialog(page);

    await expect(dialog.panel).toBeVisible();
    await expect(dialog.heading).toHaveText('Delete your account?');
    await expect(dialog.description).toHaveText('This can’t be undone.');
    await expect(dialog.hosted).toContainText('You host 2 active Popkins');
    await expect(dialog.hosted).toContainText(
      'Lakeside Weekend and Thursday Night Group will be wrapped up when your account goes.',
    );
    await expect(dialog.removed).toHaveText(
      'Removed: your name, photo, phone number and direct messages.',
    );
    await expect(dialog.kept).toHaveText(
      'Kept, without your name: your messages and photos in Popkins.',
    );
    await expect(dialog.confirm).toHaveAttribute('autocomplete', 'off');
    await expect(dialog.confirm).toHaveAttribute('autocapitalize', 'none');
  });

  // L2-049 AC3
  test('names the one Popkin hosted, and says nothing of hosting when there is none', async ({
    page,
    pk,
  }) => {
    await pk.open('account');
    const account = new AccountPage(page);
    const dialog = new DeleteAccountDialog(page);

    await account.deleteAccount.click();
    await expect(dialog.hosted).toContainText('You host 1 active Popkin');
    await expect(dialog.hosted).toContainText(
      'Lakeside Weekend will be wrapped up when your account goes.',
    );
    await dialog.keep.click();
    await hostingNothing(page);
    await account.deleteAccount.click();

    await expect(dialog.panel).toBeVisible();
    await expect(dialog.hosted).toHaveCount(0);
  });

  // L2-049 AC2
  test('"Delete my account" stays disabled until the confirmation reads delete', async ({
    page,
    pk,
  }) => {
    await pk.open('account');
    await new AccountPage(page).deleteAccount.click();
    const dialog = new DeleteAccountDialog(page);

    await expect(dialog.delete).toBeDisabled();
    await dialog.confirm.fill('delet');
    await expect(dialog.delete).toBeDisabled();
    await dialog.confirm.fill(' Delete ');
    await expect(dialog.delete).toBeEnabled();
  });

  // L2-057 AC2
  test('"Keep my account" closes it and gives the focus back', async ({ page, pk }) => {
    await pk.open('account');
    const account = new AccountPage(page);
    await account.deleteAccount.click();

    await new DeleteAccountDialog(page).keep.click();

    await expect(new DeleteAccountDialog(page).root).toHaveCount(0);
    await expect(account.deleteAccount).toBeFocused();
  });

  // L2-049 AC4
  test('confirming deletes the account, ends the session and opens the landing page with a message', async ({
    page,
    pk,
  }) => {
    const release = await hold(page, 'DELETE /api/account');
    await pk.open('account');
    await new AccountPage(page).deleteAccount.click();
    const dialog = new DeleteAccountDialog(page);

    await dialog.confirm.fill('delete');
    await dialog.delete.click();

    await expect(dialog.delete).toHaveText('Deleting…');
    await expect(dialog.delete).toBeDisabled();
    await expect(dialog.keep).toBeDisabled();
    await expect(dialog.confirm).toHaveAttribute('readonly', '');
    release();
    await expect(page).toHaveURL('/');
    await expect(new LandingPage(page).root).toBeVisible();
    const toasts = new Toasts(page);
    await expect(toasts.toast).toContainText('Your account is deleted');
    await expect(toasts.toast).toContainText('Your personal data is erased within 30 days.');
    expect(await page.evaluate(() => localStorage.getItem('popkin.my-popkins'))).toBeNull();
  });

  // L2-049 AC4: the landing page opens at its top, where its heading is
  test('on a phone the landing page opens at its top', async ({ page, pk }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await pk.open('account');
    const account = new AccountPage(page);
    await account.deleteAccount.click();
    const dialog = new DeleteAccountDialog(page);

    await dialog.confirm.fill('delete');
    await dialog.delete.click();

    await expect(new LandingPage(page).root).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });

  test('a deletion that fails keeps the dialog and the word, and says so', async ({ page, pk }) => {
    await answer(page, 'DELETE /api/account', problem(500, 'unexpected'));
    await pk.open('account');
    await new AccountPage(page).deleteAccount.click();
    const dialog = new DeleteAccountDialog(page);

    await dialog.confirm.fill('delete');
    await dialog.delete.click();

    await expect(dialog.failed).toContainText('We couldn’t delete your account.');
    await expect(dialog.confirm).toHaveValue('delete');
    await expect(dialog.delete).toBeEnabled();
    await expect(page).toHaveURL('/account');
  });

  test('when what it wraps up cannot be read, a message says so and nothing opens', async ({
    page,
    pk,
  }) => {
    await answer(page, 'GET /api/account/deletion-impact', problem(500, 'unexpected'));
    await pk.open('account');

    await new AccountPage(page).deleteAccount.click();

    await expect(new Toasts(page).toast).toContainText('We couldn’t open that.');
    await expect(new DeleteAccountDialog(page).root).toHaveCount(0);
  });
});
