import type { Page } from '@playwright/test';
import { contactsMorning } from '../../fixtures/contacts';
import { parity } from '../../fixtures/parity';
import { AddDateDialog } from '../../pages/add-date.dialog';
import { ContactFormPage } from '../../pages/contact-form.page';

/** Femi's birthday, 9 March, reminded 1 week before, as Add someone draws it. */
const birthday = async (page: Page) => {
  const form = new ContactFormPage(page);
  await form.anotherDate.click();
  const dialog = new AddDateDialog(page);
  await dialog.day.fill('1990-03-09');
  await dialog.remind.selectOption('OneWeekBefore');
  await dialog.save.click();
  await dialog.root.waitFor({ state: 'hidden' });
};

parity('date-entry', [
  {
    key: 'addContact',
    name: 'birthday',
    region: (page) => page.locator('.date-entry').first(),
    before: (page) => page.clock.install({ time: contactsMorning }),
    app: birthday,
    snap: true,
  },
]);
