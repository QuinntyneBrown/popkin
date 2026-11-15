import { signedOutOfTheConsole } from '../../fixtures/admin';
import { parity } from '../../fixtures/parity';
import { AdminErrorPage } from '../../pages/admin/error-pages';
import { AdminSignInPage } from '../../pages/admin/sign-in.page';

parity('admin-entry', [
  {
    key: 'adminSignIn',
    name: 'sign-in',
    region: (page) => new AdminSignInPage(page).entry,
    before: signedOutOfTheConsole,
  },
  {
    key: 'adminNotFound',
    name: 'not-found',
    region: (page) => new AdminErrorPage(page, 'not-found').card,
  },
]);
