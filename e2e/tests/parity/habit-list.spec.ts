import { parity } from '../../fixtures/parity';
import { ContactsHabitsPage } from '../../pages/contacts-habits.page';
import { habitsAsDrawn } from './habit-steps';

parity('habit-list', [
  // Mara's habits, divided.
  {
    key: 'contactsHabits',
    name: 'list',
    region: (page) => new ContactsHabitsPage(page).list,
    before: habitsAsDrawn,
    widths: [1280],
  },
]);
