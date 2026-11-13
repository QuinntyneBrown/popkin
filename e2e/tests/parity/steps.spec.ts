import { asVisitor } from '../../fixtures/journeys';
import { parity } from '../../fixtures/parity';
import { LandingPage } from '../../pages/landing.page';

parity('steps', [
  { key: 'landing', before: asVisitor, region: (page) => new LandingPage(page).stepList },
]);
