import { theMockHome } from '../../fixtures/home';
import { parity } from '../../fixtures/parity';
import { PopkinHomePage } from '../../pages/popkin-home.page';

parity('chat-card', [
  {
    key: 'popkinHome',
    name: 'three-new',
    region: (page) => new PopkinHomePage(page).chat,
    before: theMockHome,
  },
]);
