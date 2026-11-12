import { parity } from '../../fixtures/parity';
import { NotFoundPage } from '../../pages/not-found.page';

parity('skip-link', [
  {
    key: 'notFound',
    name: 'focused',
    region: (page) => new NotFoundPage(page).skipLink,
    prepare: (page) => page.keyboard.press('Tab'),
  },
]);
