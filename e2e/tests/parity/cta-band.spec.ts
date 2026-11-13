import { parity } from '../../fixtures/parity';
import { LandingPage } from '../../pages/landing.page';

parity('cta-band', [{ key: 'landing', region: (page) => new LandingPage(page).free }]);
