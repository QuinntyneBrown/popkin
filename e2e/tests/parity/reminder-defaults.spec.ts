import type { Page } from '@playwright/test';
import { contactsMorning, marasDates } from '../../fixtures/contacts';
import { parity } from '../../fixtures/parity';
import { ContactsDatesPage } from '../../pages/contacts-dates.page';

const mara = async (page: Page) => {
  await page.clock.install({ time: contactsMorning });
  await marasDates(page);
};

parity('reminder-defaults', [
  // The three defaults, then phone notifications and the Monday email, both on.
  {
    key: 'contactsDates',
    name: 'defaults',
    region: (page) => new ContactsDatesPage(page).remindersCard,
    before: mara,
    snap: true,
    prepare: (page) =>
      new ContactsDatesPage(page).remindersCard.evaluate((card) =>
        card.scrollIntoView({ block: 'center' }),
      ),
  },
]);
