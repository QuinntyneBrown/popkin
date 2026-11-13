import { wrapUpStates } from '../../fixtures/wrap-up-states';
import { parity } from '../../fixtures/parity';
import { WrapUpPage } from '../../pages/wrap-up.page';

parity('fact', [
  {
    key: 'wrapUp',
    ...wrapUpStates.wrapUp,
    name: 'recap',
    region: (page) => new WrapUpPage(page).factRows.first(),
  },
  {
    key: 'wrapUp',
    ...wrapUpStates.wrapUp,
    name: 'chat',
    region: (page) => new WrapUpPage(page).factRows.last(),
  },
]);
