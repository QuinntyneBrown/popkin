import { parity } from '../../fixtures/parity';
import { NotFoundPage } from '../../pages/not-found.page';

parity('logo', [{ key: 'notFound', region: (page) => new NotFoundPage(page).logo }]);
