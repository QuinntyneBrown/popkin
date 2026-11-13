import { parity } from '../../fixtures/parity';
import { WrapUpPage } from '../../pages/wrap-up.page';

parity('facts', [{ key: 'wrapUp', region: (page) => new WrapUpPage(page).facts }]);
