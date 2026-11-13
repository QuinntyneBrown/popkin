import { parity } from '../../fixtures/parity';
import { LandingPage } from '../../pages/landing.page';

parity('compare', [{ key: 'landing', region: (page) => new LandingPage(page).compare }]);
