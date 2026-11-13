import { parity } from '../../fixtures/parity';
import { LandingPage } from '../../pages/landing.page';

// The landmark draws nothing of its own: the closing section is compared where it ends.
parity('site-main', [{ key: 'landing', region: (page) => new LandingPage(page).free }]);
