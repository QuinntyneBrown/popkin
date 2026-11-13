import { parity } from '../../fixtures/parity';
import { LandingPage } from '../../pages/landing.page';

parity('band', [
  { key: 'landing', name: 'surface', region: (page) => new LandingPage(page).how },
  {
    key: 'landing',
    name: 'canvas-split-head',
    region: (page) => new LandingPage(page).ideasColumn,
  },
  { key: 'landing', name: 'sand-narrow', region: (page) => new LandingPage(page).comparison },
]);
