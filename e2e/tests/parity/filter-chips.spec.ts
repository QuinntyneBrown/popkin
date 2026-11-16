import { contactsMorning, marasPeople } from '../../fixtures/contacts';
import { parity } from '../../fixtures/parity';
import { ContactsPeoplePage } from '../../pages/contacts-people.page';

const mara = async (page: import('@playwright/test').Page) => {
  await page.clock.install({ time: contactsMorning });
  await marasPeople(page);
};

parity('filter-chips', [
  // People's circles, All pressed.
  {
    key: 'contactsPeople',
    name: 'circles',
    region: (page) => new ContactsPeoplePage(page).circles,
    before: mara,
  },
  // Family pressed.
  {
    key: 'contactsPeopleFamily',
    name: 'family',
    region: (page) => new ContactsPeoplePage(page).circles,
    before: mara,
    app: (page) => new ContactsPeoplePage(page).circle('Family').click(),
  },
]);
