import { parity } from '../../fixtures/parity';
import { NotFoundPage } from '../../pages/not-found.page';
import { SignUpPage } from '../../pages/sign-up.page';

parity('top-bar', [
  { key: 'notFound', name: 'brand', region: (page) => new NotFoundPage(page).topBar },
  { key: 'signUp', name: 'steps', region: (page) => new SignUpPage(page).topBar },
]);
