import { signedOutOfTheConsole } from '../../fixtures/admin';
import { parity } from '../../fixtures/parity';
import { AdminSignInPage } from '../../pages/admin/sign-in.page';

parity('admin-brand', [
  {
    key: 'adminSignIn',
    name: 'entry',
    region: (page) => new AdminSignInPage(page).brand,
    before: signedOutOfTheConsole,
  },
]);
