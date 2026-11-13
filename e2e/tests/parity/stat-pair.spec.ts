import { wrapUpStates } from '../../fixtures/wrap-up-states';
import { parity } from '../../fixtures/parity';
import { RecapPage } from '../../pages/recap.page';

parity('stat-pair', [
  { key: 'recap', ...wrapUpStates.recap, region: (page) => new RecapPage(page).stats },
  {
    key: 'recapPlain',
    ...wrapUpStates.recapPlain,
    name: 'no-photos',
    region: (page) => new RecapPage(page).stats,
  },
]);
