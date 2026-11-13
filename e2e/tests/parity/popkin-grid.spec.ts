import { theMockPopkins } from '../../fixtures/my-popkins';
import { parity } from '../../fixtures/parity';
import { MyPopkinsPage } from '../../pages/my-popkins.page';

parity('popkin-grid', [
  {
    key: 'myPopkins',
    name: 'cards',
    region: (page) => new MyPopkinsPage(page).grid,
    before: theMockPopkins,
  },
]);
