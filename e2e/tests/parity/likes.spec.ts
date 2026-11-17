import { parity } from '../../fixtures/parity';
import { ContactProfilePage } from '../../pages/contact-profile.page';
import { chidiAsDrawn } from './habit-steps';

parity('likes', [
  // What Chidi loves, in amber.
  {
    key: 'contactProfile',
    name: 'loves',
    region: (page) => new ContactProfilePage(page).lovesList,
    before: chidiAsDrawn,
    snap: true,
  },
]);
