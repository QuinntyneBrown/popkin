import { parity } from '../../fixtures/parity';
import { contactsMorning, marasDates } from '../../fixtures/contacts';
import { ContactsDatesPage } from '../../pages/contacts-dates.page';

parity('date-tile', [
  // The first date, soon, in its tint.
  {
    key: 'contactsDates',
    name: 'soon',
    region: (page) => new ContactsDatesPage(page).firstTile,
    before: async (page) => {
      await page.clock.install({ time: contactsMorning });
      await marasDates(page);
    },
    snap: true,
  },
]);
