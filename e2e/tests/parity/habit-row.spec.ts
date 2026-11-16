import { parity } from '../../fixtures/parity';
import { ContactsHabitsPage } from '../../pages/contacts-habits.page';
import { habitsAsDrawn } from './habit-steps';

parity('habit-row', [
  // Sunday call with Ada: weekly, kept 11 of 12, 10 weeks running, next Sun, Sep 20.
  {
    key: 'contactsHabits',
    name: 'first',
    region: (page) => new ContactsHabitsPage(page).firstRow,
    before: habitsAsDrawn,
    snap: true,
  },
  // Catch-up with Grace, ruled from the row above.
  {
    key: 'contactsHabits',
    name: 'last',
    region: (page) => new ContactsHabitsPage(page).rows.last(),
    before: habitsAsDrawn,
    snap: true,
  },
]);
