import { signedOutOfTheConsole } from '../../fixtures/admin';
import { parity } from '../../fixtures/parity';
import { AdminSignInPage } from '../../pages/admin/sign-in.page';

parity('admin-entry', [
  {
    key: 'adminSignIn',
    name: 'sign-in',
    region: (page) => new AdminSignInPage(page).entry,
    before: signedOutOfTheConsole,
  },
]);
