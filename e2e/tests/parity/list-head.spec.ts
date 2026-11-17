import { contactsMorning, marasFollowUps } from '../../fixtures/contacts';
import { parity } from '../../fixtures/parity';
import { ContactsFollowUpsPage } from '../../pages/contacts-follow-ups.page';

parity('list-head', [
  // "Overdue 1", late.
  {
    key: 'contactsFollowUps',
    name: 'late',
    region: (page) => new ContactsFollowUpsPage(page).overdueHeading,
    before: async (page) => {
      await page.clock.install({ time: contactsMorning });
      await marasFollowUps(page);
    },
    snap: true,
  },
]);
