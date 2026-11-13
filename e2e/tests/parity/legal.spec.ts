import { parity } from '../../fixtures/parity';
import { SignUpPage } from '../../pages/sign-up.page';

parity('legal', [{ key: 'signUp', region: (page) => new SignUpPage(page).legal }]);
