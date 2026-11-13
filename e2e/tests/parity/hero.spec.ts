import { parity } from '../../fixtures/parity';
import { LandingPage } from '../../pages/landing.page';

// The QR code itself differs (the mock draws a version-2 sample, the app encodes the link at
// error correction H) and it shows from 576 px. So the whole hero is compared on a phone, and
// from there its text and the card's head; the code is left to the sweep.
parity('hero', [
  { key: 'landing', name: 'phone', region: (page) => new LandingPage(page).hero, widths: [360] },
  {
    key: 'landing',
    name: 'text',
    region: (page) => new LandingPage(page).heroText,
    widths: [1280],
  },
  {
    key: 'landing',
    name: 'preview-name',
    region: (page) => new LandingPage(page).previewName,
    widths: [1280],
  },
]);
