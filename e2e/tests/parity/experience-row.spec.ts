import { theMockHome } from '../../fixtures/home';
import { parity } from '../../fixtures/parity';
import { PopkinHomePage } from '../../pages/popkin-home.page';
import { RecapPage } from '../../pages/recap.page';

parity('experience-row', [
  {
    key: 'popkinHome',
    name: 'rated',
    region: (page) => new PopkinHomePage(page).firstExperience,
    before: theMockHome,
  },
  // The recap's top-rated moment: a label above the title, which wraps, and no chevron.
  { key: 'recap', name: 'moment', region: (page) => new RecapPage(page).moment },
]);
