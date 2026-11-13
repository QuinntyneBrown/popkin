import { parity } from '../../fixtures/parity';
import { LandingPage } from '../../pages/landing.page';

parity('use', [
  { key: 'landing', name: 'amber', region: (page) => new LandingPage(page).idea('Small group') },
  { key: 'landing', name: 'berry', region: (page) => new LandingPage(page).idea('Family trip') },
]);
