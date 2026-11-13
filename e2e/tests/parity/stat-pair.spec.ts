import { parity } from '../../fixtures/parity';
import { RecapPage } from '../../pages/recap.page';

parity('stat-pair', [
  { key: 'recap', region: (page) => new RecapPage(page).stats },
  { key: 'recapPlain', name: 'no-photos', region: (page) => new RecapPage(page).stats },
]);
