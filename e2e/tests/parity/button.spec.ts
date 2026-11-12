import { parity } from '../../fixtures/parity';
import { NotFoundPage } from '../../pages/not-found.page';
import { SignUpPage } from '../../pages/sign-up.page';

parity('button', [
  { key: 'notFound', name: 'primary-md', region: (page) => new NotFoundPage(page).primaryButton },
  {
    key: 'notFound',
    name: 'secondary-md',
    region: (page) => new NotFoundPage(page).secondaryButton,
  },
  {
    key: 'signUp',
    name: 'primary-block',
    region: (page) => new SignUpPage(page).primaryButton,
  },
]);
