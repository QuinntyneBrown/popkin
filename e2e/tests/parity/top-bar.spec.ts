import { parity } from '../../fixtures/parity';
import { NotFoundPage } from '../../pages/not-found.page';

parity('top-bar', [
  { key: 'notFound', name: 'brand', region: (page) => new NotFoundPage(page).topBar },
]);
