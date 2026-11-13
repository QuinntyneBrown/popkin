import { accountStates } from '../../fixtures/account-states';
import { parity } from '../../fixtures/parity';
import { AccountPage } from '../../pages/account.page';
import { SignUpPage } from '../../pages/sign-up.page';

parity('segmented-control', [
  { key: 'signUp', name: 'phone', region: (page) => new SignUpPage(page).segmented },
  {
    key: 'signUpEmail',
    name: 'email',
    region: (page) => new SignUpPage(page).segmented,
    app: (page) => new SignUpPage(page).emailTab.click(),
  },
  // The radio form: the theme of the account (L2-048 AC4).
  {
    key: 'account',
    ...accountStates.account,
    name: 'theme',
    region: (page) => new AccountPage(page).segmented,
  },
]);
