import { parity } from '../../fixtures/parity';
import { ContactsTodayPage } from '../../pages/contacts-today.page';
import { todayAsDrawn } from './today-steps';

parity('today-dates', [
  // Chidi's anniversary, Iris at one month, Ada's and Ruth's birthdays.
  {
    key: 'contactsToday',
    name: 'coming-up',
    region: (page) => new ContactsTodayPage(page).comingUpList,
    before: todayAsDrawn,
    snap: true,
  },
]);
