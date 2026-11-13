import { theMockHome } from '../../fixtures/home';
import { parity } from '../../fixtures/parity';
import { PopkinHomePage } from '../../pages/popkin-home.page';

parity('photo-strip', [
  {
    key: 'popkinHome',
    name: 'latest',
    region: (page) => new PopkinHomePage(page).photoStrip,
    before: theMockHome,
  },
]);
