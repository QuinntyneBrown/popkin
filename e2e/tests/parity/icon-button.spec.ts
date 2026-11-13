import { parity } from '../../fixtures/parity';
import { SignUpPage } from '../../pages/sign-up.page';

parity('icon-button', [
  { key: 'signUp', name: 'back', region: (page) => new SignUpPage(page).back },
]);
