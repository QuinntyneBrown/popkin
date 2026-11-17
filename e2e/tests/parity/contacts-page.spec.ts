import { contactsMorning } from '../../fixtures/contacts';
import { marasCandidates } from '../../fixtures/import';
import { parity } from '../../fixtures/parity';

parity('contacts-page', [
  // An empty Contacts: the greeting, the day and the start, filling the screen.
  {
    key: 'contactsTodayEmpty',
    name: 'empty',
    region: (page) => page.locator('.contacts-page'),
    before: async (page) => {
      await page.clock.install({ time: contactsMorning });
      await marasCandidates(page);
    },
    snap: true,
  },
]);
