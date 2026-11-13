import { parity } from '../../fixtures/parity';
import { SignUpPage } from '../../pages/sign-up.page';

parity('segmented-control', [
  { key: 'signUp', name: 'phone', region: (page) => new SignUpPage(page).segmented },
  {
    key: 'signUpEmail',
    name: 'email',
    region: (page) => new SignUpPage(page).segmented,
    app: (page) => new SignUpPage(page).emailTab.click(),
  },
]);
