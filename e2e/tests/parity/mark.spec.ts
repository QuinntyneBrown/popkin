import { parity } from '../../fixtures/parity';
import { NotFoundPage } from '../../pages/not-found.page';

parity('mark', [{ key: 'notFound', region: (page) => new NotFoundPage(page).mark }]);
