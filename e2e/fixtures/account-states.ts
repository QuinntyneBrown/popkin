import type { Page } from '@playwright/test';
import { AccountPage } from '../pages/account.page';
import { DeleteAccountDialog } from '../pages/delete-account.dialog';
import { SignOutDialog } from '../pages/sign-out.dialog';
import { hostingTwoPopkins, theMockAccount } from './account';
import { hold } from './stubs';
import type { RouteKey } from './routes';

/*
 * The states of the account the mocks draw, for the sweeps and the parity specs: `before` is
 * the step before the page opens, `app` what brings the open page to the state.
 */

interface AccountState {
  before: (page: Page) => Promise<void>;
  app?: (page: Page) => Promise<void>;
}

async function openDeleteAccount(page: Page): Promise<void> {
  await new AccountPage(page).deleteAccount.click();
  await new DeleteAccountDialog(page).panel.waitFor();
}

export const accountStates = {
  account: { before: theMockAccount },
  accountInvalid: {
    before: theMockAccount,
    app: async (page: Page) => {
      const account = new AccountPage(page);
      await account.name.fill('');
      await account.save.click();
      await account.summary.waitFor();
    },
  },
  accountSubmitting: {
    before: async (page: Page) => {
      await theMockAccount(page);
      await hold(page, 'PATCH /api/account');
    },
    app: async (page: Page) => {
      const account = new AccountPage(page);
      await account.name.fill('Mara O.');
      await account.save.click();
      await account.saving.waitFor();
    },
  },
  accountSuccess: {
    before: theMockAccount,
    app: async (page: Page) => {
      const account = new AccountPage(page);
      await account.name.fill('Mara O.');
      await account.save.click();
      await account.saved.waitFor();
    },
  },
  signOut: {
    before: theMockAccount,
    app: async (page: Page) => {
      await new AccountPage(page).signOut.click();
      await new SignOutDialog(page).panel.waitFor();
    },
  },
  signOutBusy: {
    before: async (page: Page) => {
      await theMockAccount(page);
      await hold(page, 'POST /api/auth/sign-out');
    },
    app: async (page: Page) => {
      await new AccountPage(page).signOut.click();
      const dialog = new SignOutDialog(page);
      await dialog.signOut.click();
      await dialog.root.getByText('Signing out…').waitFor();
    },
  },
  deleteAccount: {
    before: async (page: Page) => {
      await theMockAccount(page);
      await hostingTwoPopkins(page);
    },
    app: openDeleteAccount,
  },
  deleteAccountConfirm: {
    before: async (page: Page) => {
      await theMockAccount(page);
      await hostingTwoPopkins(page);
    },
    app: async (page: Page) => {
      await openDeleteAccount(page);
      await new DeleteAccountDialog(page).confirm.fill('delete');
    },
  },
  deleteAccountBusy: {
    before: async (page: Page) => {
      await theMockAccount(page);
      await hostingTwoPopkins(page);
      await hold(page, 'DELETE /api/account');
    },
    app: async (page: Page) => {
      await openDeleteAccount(page);
      const dialog = new DeleteAccountDialog(page);
      await dialog.confirm.fill('delete');
      await dialog.delete.click();
      await dialog.root.getByText('Deleting…').waitFor();
    },
  },
} satisfies Partial<Record<RouteKey, AccountState>>;
