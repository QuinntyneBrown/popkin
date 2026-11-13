import { accountStates } from '../../fixtures/account-states';
import { parity } from '../../fixtures/parity';
import { AccountPage } from '../../pages/account.page';

parity('status-note', [
  {
    key: 'accountSuccess',
    ...accountStates.accountSuccess,
    name: 'saved',
    region: (page) => new AccountPage(page).saved,
  },
]);
