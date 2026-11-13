import { theMockPopkins } from '../../fixtures/my-popkins';
import { parity } from '../../fixtures/parity';
import { MyPopkinsPage } from '../../pages/my-popkins.page';

parity('wrapped-list', [
  {
    key: 'myPopkins',
    name: 'heading',
    region: (page) => new MyPopkinsPage(page).wrappedUpHeading,
    before: theMockPopkins,
  },
  {
    key: 'myPopkins',
    name: 'rows',
    region: (page) => new MyPopkinsPage(page).wrappedUpList,
    before: theMockPopkins,
  },
]);
