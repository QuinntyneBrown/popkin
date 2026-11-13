import { parity } from '../../fixtures/parity';
import { LandingPage } from '../../pages/landing.page';

parity('steps', [{ key: 'landing', region: (page) => new LandingPage(page).stepList }]);
