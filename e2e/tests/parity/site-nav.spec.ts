import { asVisitor } from '../../fixtures/journeys';
import { parity } from '../../fixtures/parity';
import { LandingPage } from '../../pages/landing.page';

// A phone shows the logo and the action; the links join them from 640 px and 768 px.
parity('site-nav', [
  { key: 'landing', before: asVisitor, region: (page) => new LandingPage(page).header },
]);
