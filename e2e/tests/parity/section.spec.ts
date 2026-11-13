import { theHomeEmpty, theHomeWithoutPhotos, theMockHome } from '../../fixtures/home';
import { parity } from '../../fixtures/parity';
import { PopkinHomePage } from '../../pages/popkin-home.page';

parity('section', [
  {
    key: 'popkinHome',
    name: 'head-with-link',
    region: (page) => new PopkinHomePage(page).photosHead,
    before: theMockHome,
  },
  {
    key: 'popkinHome',
    name: 'head-with-count',
    region: (page) => new PopkinHomePage(page).membersHead,
    before: theMockHome,
  },
  {
    key: 'popkinHomeEmpty',
    name: 'inset',
    region: (page) => new PopkinHomePage(page).photos,
    before: theHomeEmpty,
  },
  {
    key: 'popkinHomePartial',
    name: 'failure',
    region: (page) => new PopkinHomePage(page).photos,
    before: theHomeWithoutPhotos,
  },
]);
