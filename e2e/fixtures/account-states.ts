import type { Page } from '@playwright/test';
import { AccountPage } from '../pages/account.page';
import { theMockAccount } from './account';
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
  accountSuccess: {
    before: theMockAccount,
    app: async (page: Page) => {
      const account = new AccountPage(page);
      await account.name.fill('Mara O.');
      await account.save.click();
      await account.saved.waitFor();
    },
  },
} satisfies Partial<Record<RouteKey, AccountState>>;
