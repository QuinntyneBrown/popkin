import { parity } from '../../fixtures/parity';
import { ContactProfilePage } from '../../pages/contact-profile.page';
import { ContactsHabitsPage } from '../../pages/contacts-habits.page';
import { chidiAsDrawn, habitsAsDrawn } from './habit-steps';

parity('keep-strip', [
  // Small, on Chidi's habit card.
  {
    key: 'contactProfile',
    name: 'small',
    region: (page) => new ContactProfilePage(page).habitStrip,
    before: chidiAsDrawn,
    snap: true,
  },
  // Full size, on the first habit in Habits.
  {
    key: 'contactsHabits',
    name: 'full',
    region: (page) => new ContactsHabitsPage(page).firstStrip,
    before: habitsAsDrawn,
    snap: true,
  },
]);
