import { asVisitor } from '../../fixtures/journeys';
import { parity } from '../../fixtures/parity';
import { LandingPage } from '../../pages/landing.page';

parity('band', [
  {
    key: 'landing',
    before: asVisitor,
    name: 'surface',
    region: (page) => new LandingPage(page).how,
  },
  {
    key: 'landing',
    before: asVisitor,
    name: 'canvas-split-head',
    region: (page) => new LandingPage(page).ideasColumn,
  },
  {
    key: 'landing',
    before: asVisitor,
    name: 'sand-narrow',
    region: (page) => new LandingPage(page).comparison,
  },
]);
