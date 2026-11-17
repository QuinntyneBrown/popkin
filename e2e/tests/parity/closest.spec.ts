import { contactsMorning, marasPeople } from '../../fixtures/contacts';
import { parity } from '../../fixtures/parity';
import { ContactsPeoplePage } from '../../pages/contacts-people.page';

parity('closest', [
  // Ada, Chidi and Grace, above People's list.
  {
    key: 'contactsPeople',
    name: 'three',
    region: (page) => new ContactsPeoplePage(page).closestStrip,
    before: async (page) => {
      await page.clock.install({ time: contactsMorning });
      await marasPeople(page);
    },
  },
]);
