import { wrapUpStates } from '../../fixtures/wrap-up-states';
import { parity } from '../../fixtures/parity';
import { RecapPage } from '../../pages/recap.page';

parity('stat', [
  { key: 'recap', ...wrapUpStates.recap, region: (page) => new RecapPage(page).firstStat },
]);
