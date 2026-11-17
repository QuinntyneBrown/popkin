import { contactsMorning, marasFollowUps } from '../../fixtures/contacts';
import { parity } from '../../fixtures/parity';
import { ContactsFollowUpsPage } from '../../pages/contacts-follow-ups.page';

parity('task-list', [
  // This week: three follow-ups, divided.
  {
    key: 'contactsFollowUps',
    name: 'week',
    region: (page) => new ContactsFollowUpsPage(page).weekList,
    before: async (page) => {
      await page.clock.install({ time: contactsMorning });
      await marasFollowUps(page);
    },
    snap: true,
  },
]);
