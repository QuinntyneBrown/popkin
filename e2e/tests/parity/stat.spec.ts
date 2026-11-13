import { parity } from '../../fixtures/parity';
import { RecapPage } from '../../pages/recap.page';

parity('stat', [{ key: 'recap', region: (page) => new RecapPage(page).firstStat }]);
