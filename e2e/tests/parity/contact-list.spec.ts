import type { Page } from '@playwright/test';
import { contactsMorning, marasPeople } from '../../fixtures/contacts';
import { parity } from '../../fixtures/parity';
import { ContactsPeoplePage } from '../../pages/contacts-people.page';

const mara = async (page: Page) => {
  await page.clock.install({ time: contactsMorning });
  await marasPeople(page);
};

parity('contact-list', [
  // Ada: a photo, a near date in bold, last talked on Sunday.
  {
    key: 'contactsPeople',
    name: 'row',
    region: (page) => new ContactsPeoplePage(page).firstRow,
    before: mara,
  },
  // Sam: initials, a date next year kind first, drifting.
  {
    key: 'contactsPeople',
    name: 'quiet',
    region: (page) => new ContactsPeoplePage(page).row('Sam Ortega'),
    before: mara,
    snap: true,
    // Clear of the tabs fixed at the foot of a phone's screen.
    prepare: (page) =>
      new ContactsPeoplePage(page)
        .row('Sam Ortega')
        .evaluate((row) => row.scrollIntoView({ block: 'center' })),
  },
  // Closest: Ada, Chidi and Grace.
  {
    key: 'contactsPeople',
    name: 'closest',
    region: (page) => new ContactsPeoplePage(page).closestStrip,
    before: mara,
  },
]);
