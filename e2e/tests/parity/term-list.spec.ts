import { accountStates } from '../../fixtures/account-states';
import { parity } from '../../fixtures/parity';
import { DeleteAccountDialog } from '../../pages/delete-account.dialog';

parity('term-list', [
  {
    key: 'deleteAccount',
    ...accountStates.deleteAccount,
    name: 'removed-and-kept',
    region: (page) => new DeleteAccountDialog(page).terms,
  },
]);
