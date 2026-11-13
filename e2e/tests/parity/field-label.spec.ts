import { accountStates } from '../../fixtures/account-states';
import { parity } from '../../fixtures/parity';
import { AccountPage } from '../../pages/account.page';

parity('field-label', [
  {
    key: 'account',
    ...accountStates.account,
    name: 'theme',
    region: (page) => new AccountPage(page).themeLabel,
  },
]);
