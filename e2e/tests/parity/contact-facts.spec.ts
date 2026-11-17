import { parity } from '../../fixtures/parity';
import { ContactProfilePage } from '../../pages/contact-profile.page';
import { chidiAsDrawn } from './habit-steps';

parity('contact-facts', [
  // Chidi's phone, email, city and how they met.
  {
    key: 'contactProfile',
    name: 'about',
    region: (page) => new ContactProfilePage(page).factsList,
    before: chidiAsDrawn,
    snap: true,
  },
]);
