import type { Page } from '@playwright/test';
import { contactsMorning, marasDates } from '../../fixtures/contacts';
import { parity } from '../../fixtures/parity';
import { ContactsDatesPage } from '../../pages/contacts-dates.page';

const mara = async (page: Page) => {
  await page.clock.install({ time: contactsMorning });
  await marasDates(page);
};

parity('date-list', [
  // Grace's birthday: soon, a photo, turning 33 in 4 days, 1 week before.
  {
    key: 'contactsDates',
    name: 'soon',
    region: (page) => new ContactsDatesPage(page).firstRow,
    before: mara,
    snap: true,
  },
  // Ifeoma's birthday: initials, 85 days away.
  {
    key: 'contactsDates',
    name: 'later',
    region: (page) => new ContactsDatesPage(page).row('Ifeoma’s birthday'),
    before: mara,
    snap: true,
    prepare: (page) =>
      new ContactsDatesPage(page)
        .row('Ifeoma’s birthday')
        .evaluate((row) => row.scrollIntoView({ block: 'center' })),
  },
]);
