import { parity } from '../../fixtures/parity';
import { NotFoundPage } from '../../pages/not-found.page';

parity('icon', [
  { key: 'notFound', name: 'xl', region: (page) => new NotFoundPage(page).emptyIcon },
]);
