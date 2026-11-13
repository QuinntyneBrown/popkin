import { parity } from '../../fixtures/parity';
import { SignUpPage } from '../../pages/sign-up.page';

// The aside is not rendered below 768 px, so there is nothing to compare at 360 px.
parity('split-aside', [
  {
    key: 'signUp',
    name: 'photo',
    region: (page) => new SignUpPage(page).picture,
    widths: [1280],
  },
]);
