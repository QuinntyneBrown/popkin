import type { Page } from '@playwright/test';
import { AccountPage } from '../pages/account.page';
import { SignOutDialog } from '../pages/sign-out.dialog';
import { theMockAccount } from './account';
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
} satisfies Partial<Record<RouteKey, AccountState>>;
