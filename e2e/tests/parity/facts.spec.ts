import { wrapUpStates } from '../../fixtures/wrap-up-states';
import { parity } from '../../fixtures/parity';
import { WrapUpPage } from '../../pages/wrap-up.page';

parity('facts', [
  { key: 'wrapUp', ...wrapUpStates.wrapUp, region: (page) => new WrapUpPage(page).facts },
]);
