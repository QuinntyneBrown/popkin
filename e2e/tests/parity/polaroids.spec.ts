import { parity } from '../../fixtures/parity';
import { RecapPage } from '../../pages/recap.page';

parity('polaroids', [
  // Larger prints at 1280 px, where the collage is beside the numbers.
  { key: 'recap', name: 'three', region: (page) => new RecapPage(page).collage },
  // No photo was shared: the emoji alone.
  { key: 'recapPlain', name: 'empty', region: (page) => new RecapPage(page).collage },
]);
