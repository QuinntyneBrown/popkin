import type { Page } from '@playwright/test';
import { contactsMorning, marasFollowUps } from '../../fixtures/contacts';
import { parity } from '../../fixtures/parity';
import { ContactsFollowUpsPage } from '../../pages/contacts-follow-ups.page';

const mara = async (page: Page) => {
  await page.clock.install({ time: contactsMorning });
  await marasFollowUps(page);
};

parity('task', [
  // Dev's introduction: a promise, 2 days late.
  {
    key: 'contactsFollowUps',
    name: 'late',
    region: (page) => new ContactsFollowUpsPage(page).firstTask,
    before: mara,
    snap: true,
  },
  // Grace's birthday card: no promise, due Friday.
  {
    key: 'contactsFollowUps',
    name: 'plain',
    region: (page) =>
      new ContactsFollowUpsPage(page).task('Pick up her birthday card and a bottle of orange wine'),
    before: mara,
    snap: true,
  },
  // The soup pot, done on 10 September.
  {
    key: 'contactsFollowUpsDone',
    name: 'done',
    region: (page) => new ContactsFollowUpsPage(page).doneTask,
    before: mara,
    app: (page) => new ContactsFollowUpsPage(page).showDone.click(),
    snap: true,
  },
]);
