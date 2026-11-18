import { parity } from '../../fixtures/parity';
import { ContactAddedPage } from '../../pages/contact-added.page';

parity('avatar-tick', [
  {
    key: 'contactAdded',
    name: 'initials',
    region: (page) => new ContactAddedPage(page).avatar,
  },
]);
