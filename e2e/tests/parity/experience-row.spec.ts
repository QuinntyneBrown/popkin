import { theMockHome } from '../../fixtures/home';
import { parity } from '../../fixtures/parity';
import { PopkinHomePage } from '../../pages/popkin-home.page';

parity('experience-row', [
  {
    key: 'popkinHome',
    name: 'rated',
    region: (page) => new PopkinHomePage(page).firstExperience,
    before: theMockHome,
  },
]);
