import { parity } from '../../fixtures/parity';
import { NotFoundPage } from '../../pages/not-found.page';

parity('screen', [{ key: 'notFound', region: (page) => new NotFoundPage(page).screen }]);
