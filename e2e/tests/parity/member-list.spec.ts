import { theHomeEmpty, theMockHome } from '../../fixtures/home';
import { parity } from '../../fixtures/parity';
import { PopkinHomePage } from '../../pages/popkin-home.page';

parity('member-list', [
  {
    key: 'popkinHome',
    name: 'host-first',
    region: (page) => new PopkinHomePage(page).memberList,
    before: theMockHome,
  },
  {
    key: 'popkinHomeEmpty',
    name: 'host-alone',
    region: (page) => new PopkinHomePage(page).memberList,
    before: theHomeEmpty,
    // On a phone the tabs lie over the last row of this short home; they are not this list's.
    widths: [1280],
  },
]);
