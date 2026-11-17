import { parity } from '../../fixtures/parity';
import { contactsMorning, nobodyInPeople } from '../../fixtures/contacts';
import { marasCandidates } from '../../fixtures/import';
import { ContactsPeoplePage } from '../../pages/contacts-people.page';
import { ImportContactsDialog } from '../../pages/import-contacts.dialog';
import type { Page } from '@playwright/test';

async function candidates(page: Page): Promise<void> {
  await page.clock.install({ time: contactsMorning });
  await nobodyInPeople(page);
  await marasCandidates(page);
}

async function openImport(page: Page): Promise<void> {
  await new ContactsPeoplePage(page).importPeople.click();
  await new ImportContactsDialog(page).import.waitFor();
}

parity('tick-group', [
  // Lakeside Weekend: its tile, name and 13 people, the first four ticked, and Show 9 more.
  {
    key: 'importContacts',
    name: 'ticked',
    region: (page) => new ImportContactsDialog(page).section('Lakeside Weekend'),
    before: candidates,
    app: openImport,
    snap: true,
  },
  // Thursday Night Group with nobody ticked.
  {
    key: 'importContactsNobody',
    name: 'nobody',
    region: (page) => new ImportContactsDialog(page).section('Thursday Night Group'),
    before: candidates,
    app: async (page) => {
      await openImport(page);
      await new ImportContactsDialog(page).tickAll.click();
    },
    snap: true,
  },
]);
