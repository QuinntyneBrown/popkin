import { theMockHome } from '../../fixtures/home';
import { parity } from '../../fixtures/parity';
import { PopkinHomePage } from '../../pages/popkin-home.page';

parity('rating', [
  {
    key: 'popkinHome',
    name: 'score',
    region: (page) => new PopkinHomePage(page).firstRating,
    before: theMockHome,
  },
]);
