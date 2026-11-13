import { parity } from '../../fixtures/parity';
import { LandingPage } from '../../pages/landing.page';

parity('site-footer', [{ key: 'landing', region: (page) => new LandingPage(page).footer }]);
