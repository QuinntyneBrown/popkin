import { parity } from '../../fixtures/parity';
import { ContactsTodayPage } from '../../pages/contacts-today.page';
import { todayAsDrawn } from './today-steps';

parity('drift', [
  // Sam and Joel, under a hairline below Recently.
  {
    key: 'contactsToday',
    name: 'while',
    region: (page) => new ContactsTodayPage(page).drift,
    before: todayAsDrawn,
    snap: true,
  },
]);
