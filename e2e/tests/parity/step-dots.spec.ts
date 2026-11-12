import { parity } from '../../fixtures/parity';
import { SignUpPage } from '../../pages/sign-up.page';

parity('step-dots', [
  { key: 'signUp', name: 'step-1-of-3', region: (page) => new SignUpPage(page).stepDots },
]);
