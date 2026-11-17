import { parity } from '../../fixtures/parity';
import { ContactsHabitsPage } from '../../pages/contacts-habits.page';
import { habitsAsDrawn } from './habit-steps';

parity('spotlight', [
  // Lunch with Chidi, two days overdue: Call Chidi, We met up and its strip.
  {
    key: 'contactsHabits',
    name: 'row',
    region: (page) => new ContactsHabitsPage(page).lead,
    before: habitsAsDrawn,
    snap: true,
  },
]);
