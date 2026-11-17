import { parity } from '../../fixtures/parity';
import { ContactsTodayPage } from '../../pages/contacts-today.page';
import { todayAsDrawn } from './today-steps';

parity('recent-list', [
  // Four conversations and Dev's move, newest first. At 360 the mock's page runs longer than
  // 1400 px, so its tab bar covers the last row: the rows are compared at 1280.
  {
    key: 'contactsToday',
    name: 'recently',
    region: (page) => new ContactsTodayPage(page).recentList,
    before: todayAsDrawn,
    snap: true,
    widths: [1280],
  },
]);
