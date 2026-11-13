import { theMockPopkins, thePopkinsEmpty } from '../../fixtures/my-popkins';
import { parity } from '../../fixtures/parity';
import { MyPopkinsPage } from '../../pages/my-popkins.page';

// The page layout is compared by its header, ruled off and inset with the page, and by its
// heading; the floating action is the fab's own spec.
parity('page-screen', [
  {
    key: 'myPopkins',
    name: 'header',
    region: (page) => new MyPopkinsPage(page).topBar,
    before: theMockPopkins,
  },
  {
    key: 'myPopkins',
    name: 'heading',
    region: (page) => new MyPopkinsPage(page).heading,
    before: theMockPopkins,
  },
  {
    key: 'myPopkinsEmpty',
    name: 'header-without-new',
    region: (page) => new MyPopkinsPage(page).topBar,
    before: thePopkinsEmpty,
  },
]);
