import { asVisitor } from '../../fixtures/journeys';
import { parity } from '../../fixtures/parity';
import { LandingPage } from '../../pages/landing.page';

parity('use', [
  {
    key: 'landing',
    before: asVisitor,
    name: 'amber',
    region: (page) => new LandingPage(page).idea('Small group'),
  },
  {
    key: 'landing',
    before: asVisitor,
    name: 'berry',
    region: (page) => new LandingPage(page).idea('Family trip'),
  },
]);
