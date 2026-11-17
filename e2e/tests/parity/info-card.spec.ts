import { parity } from '../../fixtures/parity';
import { ContactProfilePage } from '../../pages/contact-profile.page';
import { chidiAsDrawn } from './habit-steps';

parity('info-card', [
  // Lunch with Chidi on his profile: every 2 weeks, its strip, overdue since Sep 13.
  {
    key: 'contactProfile',
    name: 'habit',
    region: (page) => new ContactProfilePage(page).habit,
    before: chidiAsDrawn,
    snap: true,
  },
]);
