import { parity } from '../../fixtures/parity';
import { ContactsTodayPage } from '../../pages/contacts-today.page';
import { todayAsDrawn } from './today-steps';

parity('drift-chips', [
  // Sam at 59 days and Joel at 33.
  {
    key: 'contactsToday',
    name: 'two',
    region: (page) => new ContactsTodayPage(page).driftChips,
    before: todayAsDrawn,
  },
]);
