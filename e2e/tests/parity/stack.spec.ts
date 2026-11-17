import { parity } from '../../fixtures/parity';
import { SignUpPage } from '../../pages/sign-up.page';

parity('stack', [
  // The sign-up form: its fields 24px apart (`gap="lg"`).
  { key: 'signUp', name: 'lg', region: (page) => new SignUpPage(page).form },
]);
