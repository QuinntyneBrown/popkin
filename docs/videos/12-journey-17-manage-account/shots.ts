import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { savedAs, theMockAccount } from '../../../e2e/fixtures/account';
import { theMockPopkins } from '../../../e2e/fixtures/my-popkins';
import { type Pk, test } from '../../../e2e/fixtures/pk-test';
import { AccountPage } from '../../../e2e/pages/account.page';
import { MyPopkinsPage } from '../../../e2e/pages/my-popkins.page';
import { SignOutDialog } from '../../../e2e/pages/sign-out.dialog';
import { WelcomePage } from '../../../e2e/pages/welcome.page';
import { detail, frame, shot, type Size, type Theme } from '../../../tools/video-record/shots';

/**
 * The screenshots of video 12: journey 17, Manage account, in the running app. The account is
 * opened by its key in `e2e/fixtures/routes.ts`, with Mara's photograph (`theMockAccount`). Every
 * /api request is answered in memory by the fixtures of `e2e/` or the recording (ADR 0005); no
 * backend and no database ran. Not a test and not a sweep: only
 * `node tools/video-record/record.mjs docs/videos/12-journey-17-manage-account` runs it.
 */

const SIZES = ['XS', 'M', 'L', 'XL'] as const satisfies readonly Size[];

async function pictures(page: Page): Promise<void> {
  await page.evaluate(() =>
    Promise.all(
      [...document.images].map((image) => image.complete || image.decode().catch(() => undefined)),
    ),
  );
}

async function accountAt(page: Page, pk: Pk, size: Size, theme: Theme = 'light'): Promise<AccountPage> {
  await frame(page, size, theme);
  await theMockAccount(page);
  await pk.open('account');
  const account = new AccountPage(page);
  await expect(account.name).toHaveValue('Mara Okafor');
  await pictures(page);
  return account;
}

for (const size of SIZES) {
  test(`the account at ${size}`, async ({ page, pk }) => {
    await accountAt(page, pk, size);
    await shot(page, `account-${size.toLowerCase()}`);
  });
}

test('the account, close up', async ({ page, pk }) => {
  const account = await accountAt(page, pk, 'XS');
  await detail(account.photo, 'photo', 20);
  await detail(account.fields.nth(0), 'name-field', 12);
  await detail(account.fields.nth(1), 'contact-field', 12);
  await detail(account.theme, 'theme', 12);
  await detail(account.menu, 'menu', 12);
});

test('from My Popkins', async ({ page, pk }) => {
  await frame(page, 'XS');
  await theMockPopkins(page);
  await pk.open('myPopkins');
  await pictures(page);
  await detail(new MyPopkinsPage(page).account, 'avatar', 16);
});

test('a new name, saved', async ({ page, pk }) => {
  await savedAs(page, 'Mara O.');
  const account = await accountAt(page, pk, 'XS');
  await account.name.fill('Mara O.');
  await account.save.click();
  await expect(account.saved).toBeVisible();
  await shot(page, 'saved-xs');
  await detail(account.saved, 'saved', 16);
});

test('an empty name', async ({ page, pk }) => {
  const account = await accountAt(page, pk, 'XS');
  await account.name.fill('');
  await account.save.click();
  await expect(account.summary).toBeVisible();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await shot(page, 'invalid-xs');
  await detail(account.summary, 'summary', 12);
  await detail(account.fields.nth(0), 'name-invalid', 12);
});

test('the dark theme', async ({ page, pk }) => {
  const account = await accountAt(page, pk, 'XS');
  await account.themeOption('Dark').click();
  await pictures(page);
  await shot(page, 'account-xs-dark');
  await detail(account.theme, 'theme-dark', 12);
});

test('signing out', async ({ page, pk }) => {
  const account = await accountAt(page, pk, 'XS');
  await account.signOut.click();
  const dialog = new SignOutDialog(page);
  await dialog.panel.waitFor();
  await shot(page, 'sign-out-xs');
  await detail(dialog.panel, 'sign-out-panel', 0);
  await dialog.signOut.click();
  await expect(new WelcomePage(page).root).toBeVisible();
  await pictures(page);
  await shot(page, 'welcome-xs');
});

test('signing out on a desktop', async ({ page, pk }) => {
  const account = await accountAt(page, pk, 'XL');
  await account.signOut.click();
  await new SignOutDialog(page).panel.waitFor();
  await shot(page, 'sign-out-xl');
});
