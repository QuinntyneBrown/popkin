import { theHomeEmpty, theHomeLoading, theMockHome } from '../../fixtures/home';
import { parity } from '../../fixtures/parity';
import { PopkinHomePage } from '../../pages/popkin-home.page';

parity('home-header', [
  // Without "Popkin settings", which journey 9 builds: the parts beside it are compared.
  {
    key: 'popkinHome',
    name: 'identity',
    region: (page) => new PopkinHomePage(page).identity,
    before: theMockHome,
    // From 768 px the mock's "Popkin settings" shares the row and narrows this part.
    widths: [360],
  },
  {
    key: 'popkinHome',
    name: 'time-left',
    region: (page) => new PopkinHomePage(page).timeLeft,
    before: theMockHome,
  },
  {
    key: 'popkinHomeEmpty',
    name: 'one-member',
    region: (page) => new PopkinHomePage(page).identity,
    before: theHomeEmpty,
    widths: [360],
  },
  {
    key: 'popkinHomeLoading',
    name: 'loading',
    region: (page) => new PopkinHomePage(page).header,
    before: theHomeLoading,
  },
]);
