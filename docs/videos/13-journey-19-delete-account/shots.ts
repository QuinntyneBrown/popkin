import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { hostingTwoPopkins, theMockAccount } from '../../../e2e/fixtures/account';
import { type Pk, test } from '../../../e2e/fixtures/pk-test';
import { hold } from '../../../e2e/fixtures/stubs';
import { AccountPage } from '../../../e2e/pages/account.page';
import { DeleteAccountDialog } from '../../../e2e/pages/delete-account.dialog';
import { LandingPage } from '../../../e2e/pages/landing.page';
import { Toasts } from '../../../e2e/pages/toasts';
import { detail, frame, shot, type Size, type Theme } from '../../../tools/video-record/shots';

/**
 * The screenshots of video 13: journey 19, Delete account, in the running app. Mara hosts the two
 * active Popkins the mocks name (`hostingTwoPopkins`). Every /api request is answered in memory by
 * the fixtures of `e2e/` or the recording (ADR 0005); no backend and no database ran, and nothing
 * was deleted. Not a test and not a sweep: only
 * `node tools/video-record/record.mjs docs/videos/13-journey-19-delete-account` runs it.
 */

const SIZES = ['XS', 'M', 'L', 'XL'] as const satisfies readonly Size[];

async function pictures(page: Page): Promise<void> {
  await page.evaluate(() =>
    Promise.all(
      [...document.images].map((image) => image.complete || image.decode().catch(() => undefined)),
    ),
  );
}

/** The account, with the dialog open over it, at a size and a theme. */
async function dialogAt(page: Page, pk: Pk, size: Size, theme: Theme = 'light'): Promise<DeleteAccountDialog> {
  await frame(page, size, theme);
  await theMockAccount(page);
  await hostingTwoPopkins(page);
  await pk.open('account');
  const account = new AccountPage(page);
  await expect(account.name).toHaveValue('Mara Okafor');
  await pictures(page);
  await account.deleteAccount.click();
  const dialog = new DeleteAccountDialog(page);
  await dialog.panel.waitFor();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  return dialog;
}

test('the account, and its last row', async ({ page, pk }) => {
  await frame(page, 'XS');
  await theMockAccount(page);
  await pk.open('account');
  const account = new AccountPage(page);
  await expect(account.name).toHaveValue('Mara Okafor');
  await pictures(page);
  await account.menu.scrollIntoViewIfNeeded();
  await shot(page, 'account-xs');
  await detail(account.menu, 'menu', 12);
});

for (const size of SIZES) {
  test(`the dialog at ${size}`, async ({ page, pk }) => {
    await dialogAt(page, pk, size);
    await shot(page, `dialog-${size.toLowerCase()}`);
  });
}

test('the dialog, close up', async ({ page, pk }) => {
  const dialog = await dialogAt(page, pk, 'XS');
  await detail(dialog.hosted, 'hosted', 12);
  await detail(dialog.removed, 'removed', 10);
  await detail(dialog.kept, 'kept', 10);
  await detail(dialog.delete, 'delete-disabled', 10);
  await dialog.confirm.fill('delete');
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await detail(dialog.confirm, 'confirm-typed', 10);
  await detail(dialog.delete, 'delete-enabled', 10);
  await shot(page, 'confirm-xs');
});

test('the dialog in the dark', async ({ page, pk }) => {
  await dialogAt(page, pk, 'XS', 'dark');
  await shot(page, 'dialog-xs-dark');
});

test('deleting', async ({ page, pk }) => {
  const release = await hold(page, 'DELETE /api/account');
  const dialog = await dialogAt(page, pk, 'XS');
  await dialog.confirm.fill('delete');
  await dialog.delete.click();
  await expect(dialog.delete).toHaveText('Deleting…');
  await shot(page, 'busy-xs');
  await detail(dialog.footer, 'busy-footer', 10);
  release();
  await expect(new LandingPage(page).root).toBeVisible();
  const toast = new Toasts(page).toast;
  await expect(toast).toContainText('Your account is deleted');
  await pictures(page);
  await shot(page, 'landing-xs');
  await detail(toast, 'toast', 12);
});

test('deleted, on a desktop', async ({ page, pk }) => {
  const dialog = await dialogAt(page, pk, 'XL');
  await dialog.confirm.fill('delete');
  await dialog.delete.click();
  await expect(new Toasts(page).toast).toContainText('Your account is deleted');
  await pictures(page);
  await shot(page, 'landing-xl');
});
