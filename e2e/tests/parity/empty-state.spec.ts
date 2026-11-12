import { parity } from '../../fixtures/parity';
import { NotFoundPage } from '../../pages/not-found.page';

parity('empty-state', [{ key: 'notFound', region: (page) => new NotFoundPage(page).emptyState }]);
