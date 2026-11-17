import { parity } from '../../fixtures/parity';
import { ContactsHabitsPage } from '../../pages/contacts-habits.page';
import { habitsAsDrawn } from './habit-steps';

parity('contacts-grid', [
  // Habits in the narrow grid, read top to bottom.
  {
    key: 'contactsHabits',
    name: 'narrow',
    region: (page) => new ContactsHabitsPage(page).grid,
    before: habitsAsDrawn,
    widths: [1280],
  },
]);
