import { theHomeLoading, theMockHome } from '../../fixtures/home';
import { parity } from '../../fixtures/parity';
import { PopkinHomePage } from '../../pages/popkin-home.page';

parity('home', [
  {
    key: 'popkinHome',
    name: 'side',
    region: (page) => new PopkinHomePage(page).side,
    before: theMockHome,
  },
  {
    key: 'popkinHomeLoading',
    name: 'loading',
    region: (page) => new PopkinHomePage(page).bodySkeleton,
    before: theHomeLoading,
  },
]);
