import { thePopkinsLoading } from '../../fixtures/my-popkins';
import { parity } from '../../fixtures/parity';
import { MyPopkinsPage } from '../../pages/my-popkins.page';

// L2-017 AC7: the loading cards are the size of real cards, in the same columns.
parity('popkin-skeleton', [
  {
    key: 'myPopkinsLoading',
    name: 'cards',
    region: (page) => new MyPopkinsPage(page).skeletonCards,
    before: thePopkinsLoading,
  },
]);
