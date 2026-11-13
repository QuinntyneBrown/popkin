import { parity } from '../../fixtures/parity';
import { WrapUpPage } from '../../pages/wrap-up.page';

parity('fact', [
  { key: 'wrapUp', name: 'recap', region: (page) => new WrapUpPage(page).factRows.first() },
  { key: 'wrapUp', name: 'chat', region: (page) => new WrapUpPage(page).factRows.last() },
]);
