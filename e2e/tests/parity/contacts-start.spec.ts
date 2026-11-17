import { contactsMorning } from '../../fixtures/contacts';
import { marasCandidates } from '../../fixtures/import';
import { parity } from '../../fixtures/parity';
import { ContactsTodayPage } from '../../pages/contacts-today.page';

parity('contacts-start', [
  // Contacts with nobody yet.
  {
    key: 'contactsTodayEmpty',
    name: 'empty',
    region: (page) => new ContactsTodayPage(page).start,
    before: async (page) => {
      await page.clock.install({ time: contactsMorning });
      await marasCandidates(page);
    },
    snap: true,
  },
]);
