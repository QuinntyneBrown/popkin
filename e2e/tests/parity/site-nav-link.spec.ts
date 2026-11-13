import { asVisitor } from '../../fixtures/journeys';
import { parity } from '../../fixtures/parity';
import { LandingPage } from '../../pages/landing.page';

// A link of the navigation is not rendered on a phone, so there is nothing to compare at 360 px.
parity('site-nav-link', [
  {
    key: 'landing',
    before: asVisitor,
    name: 'from-m',
    region: (page) => new LandingPage(page).navHowItWorks,
    widths: [1280],
  },
  {
    key: 'landing',
    before: asVisitor,
    name: 'from-s',
    region: (page) => new LandingPage(page).navSignIn,
    widths: [1280],
  },
]);
