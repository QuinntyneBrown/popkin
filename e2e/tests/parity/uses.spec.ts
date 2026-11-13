import { parity } from '../../fixtures/parity';
import { LandingPage } from '../../pages/landing.page';

parity('uses', [{ key: 'landing', region: (page) => new LandingPage(page).ideaGrid }]);
