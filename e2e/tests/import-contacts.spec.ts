import type { Page } from '@playwright/test';
import { contactsMorning, nobodyInPeople } from '../fixtures/contacts';
import {
  importKey,
  importPostKey,
  marasCandidates,
  noCandidates,
  personId,
} from '../fixtures/import';
import { expect, test } from '../fixtures/pk-test';
import { answer, failNetwork, hold } from '../fixtures/stubs';
import { ContactsPeoplePage } from '../pages/contacts-people.page';
import { ContactsTodayPage } from '../pages/contacts-today.page';
import { ImportContactsDialog } from '../pages/import-contacts.dialog';
import type { RouteKey } from '../fixtures/routes';

/** Opens Import from People's empty state. */
async function openImport(
  page: Page,
  pk: { open: (key: RouteKey) => Promise<void> },
): Promise<ImportContactsDialog> {
  await page.clock.install({ time: contactsMorning });
  await nobodyInPeople(page);
  await pk.open('contactsPeopleEmpty');
  await new ContactsPeoplePage(page).importPeople.click();
  return new ImportContactsDialog(page);
}

test.describe('Import from your Popkins', () => {
  // L2-151 AC1, AC2, AC6
  test('lists the people of each Popkin A to Z, four at first, all ticked and counted once', async ({
    page,
    pk,
  }) => {
    await marasCandidates(page);
    const dialog = await openImport(page, pk);

    await expect(dialog.heading).toHaveText('Import from your Popkins');
    await expect(dialog.description).toHaveText(
      'Everyone you share a Popkin with, once each. They aren’t told, and only you will see them.',
    );
    await expect(dialog.sections).toHaveCount(3);
    await expect(dialog.section('Lakeside Weekend')).toContainText('13 people');
    await expect(dialog.list('Lakeside Weekend').getByRole('checkbox')).toHaveCount(4);
    await expect(dialog.list('Lakeside Weekend').locator('li')).toHaveText([
      'Dev Patel',
      'Ellie Brennan',
      'Grace Adeyemi',
      'Walt Brennan',
    ]);
    for (const box of await dialog.root.getByRole('checkbox').all())
      await expect(box).toBeChecked();
    await expect(dialog.showMore('Lakeside Weekend')).toHaveText('Show 9 more');
    await expect(dialog.showMore('Thursday Night Group')).toHaveText('Show 4 more');
    await expect(dialog.showMore('Tigers U9 Parents')).toHaveText('Show 14 more');
    await expect(dialog.import).toHaveText('Import 23 people');
  });

  // L2-151 AC6
  test('Show more shows the rest of that Popkin', async ({ page, pk }) => {
    await marasCandidates(page);
    const dialog = await openImport(page, pk);

    await dialog.showMore('Lakeside Weekend').click();

    await expect(dialog.list('Lakeside Weekend').getByRole('checkbox')).toHaveCount(13);
    await expect(dialog.showMore('Lakeside Weekend')).toHaveCount(0);
  });

  // L2-151 AC2
  test('unticking someone in one Popkin unticks them in every Popkin', async ({ page, pk }) => {
    await marasCandidates(page);
    const dialog = await openImport(page, pk);

    await dialog.person('Lakeside Weekend', 'Walt Brennan').uncheck();

    await expect(dialog.person('Thursday Night Group', 'Walt Brennan')).not.toBeChecked();
    await expect(dialog.import).toHaveText('Import 22 people');
  });

  // L2-151 AC3, AC7
  test('Tick nobody turns Import off, and Tick everyone ticks them again', async ({ page, pk }) => {
    await marasCandidates(page);
    const dialog = await openImport(page, pk);

    await dialog.tickAll.click();

    await expect(dialog.import).toHaveText('Import nobody');
    await expect(dialog.import).toBeDisabled();
    await expect(dialog.tickAll).toHaveText('Tick everyone');
    await dialog.tickAll.click();
    await expect(dialog.import).toHaveText('Import 23 people');
  });

  // L2-151 AC4
  test('imports those ticked once each and opens People', async ({ page, pk }) => {
    await marasCandidates(page);
    const dialog = await openImport(page, pk);
    await dialog.person('Tigers U9 Parents', 'Sam Ortega').uncheck();
    await answer(page, importPostKey, { status: 200, body: { imported: 22 } });
    const request = page.waitForRequest(
      (r) => r.method() === 'POST' && r.url().endsWith('/api/contacts/import'),
    );

    await dialog.import.click();

    const sent = (await request).postDataJSON() as { clientId: string; personIds: string[] };
    expect(sent.personIds).toHaveLength(22);
    expect(sent.personIds).not.toContain(personId('Sam Ortega'));
    expect(new Set(sent.personIds).size).toBe(22);
    await expect(page).toHaveURL('/contacts/people');
  });

  // L2-151 AC5
  test('Not now imports nothing', async ({ page, pk }) => {
    await marasCandidates(page);
    const dialog = await openImport(page, pk);
    let sent = false;
    page.on('request', (r) => {
      if (r.method() === 'POST' && r.url().endsWith('/api/contacts/import')) sent = true;
    });

    await dialog.notNow.click();

    await expect(dialog.root).toHaveCount(0);
    expect(sent).toBe(false);
  });

  // L2-151 AC9
  test('a failed import keeps every tick and says so', async ({ page, pk }) => {
    await marasCandidates(page);
    await failNetwork(page, importPostKey);
    const dialog = await openImport(page, pk);
    await dialog.person('Lakeside Weekend', 'Dev Patel').uncheck();

    await dialog.import.click();

    await expect(dialog.failed).toContainText('We couldn’t import them.');
    await expect(dialog.failed).toContainText('Everyone you ticked is still ticked.');
    await expect(dialog.person('Lakeside Weekend', 'Dev Patel')).not.toBeChecked();
    await expect(dialog.import).toHaveText('Import 22 people');
  });

  test('says Importing… while it is sent', async ({ page, pk }) => {
    await marasCandidates(page);
    await hold(page, importPostKey);
    const dialog = await openImport(page, pk);

    await dialog.import.click();

    await expect(dialog.import).toHaveText('Importing 23 people…');
    await expect(dialog.import).toBeDisabled();
  });

  // L2-151 AC8
  test('a failed read says so, and Try again reads again', async ({ page, pk }) => {
    await failNetwork(page, importKey);
    const dialog = await openImport(page, pk);

    await expect(dialog.failed).toContainText('We couldn’t load your Popkins’ people.');
    await marasCandidates(page);
    await dialog.tryAgain.click();
    await expect(dialog.import).toHaveText('Import 23 people');
  });

  // L2-151 AC8
  test('with nobody to import, says so and offers Close', async ({ page, pk }) => {
    await noCandidates(page);
    const dialog = await openImport(page, pk);

    await expect(dialog.emptyHeading).toHaveText('No one to import yet');
    await expect(dialog.emptyText).toHaveText(
      'When you share a Popkin with someone, they show here.',
    );
    await expect(dialog.import).toHaveCount(0);
    await dialog.close.click();
    await expect(dialog.root).toHaveCount(0);
  });

  test('says it is loading while the people are read', async ({ page, pk }) => {
    await hold(page, importKey);
    const dialog = await openImport(page, pk);

    await expect(dialog.loading).toHaveText('Loading your Popkins’ people…');
  });
});

test.describe('Import from Today', () => {
  // L2-125 AC8
  test('counts who is ready to import, and opens Import', async ({ page, pk }) => {
    await page.clock.install({ time: contactsMorning });
    await nobodyInPeople(page);
    await marasCandidates(page);
    await pk.open('contactsTodayEmpty');
    const today = new ContactsTodayPage(page);

    await expect(today.start).toContainText(
      '23 people from your Popkins are ready to import. Only you can see your contacts.',
    );
    await today.start.getByRole('button', { name: 'Import from your Popkins' }).click();
    await expect(new ImportContactsDialog(page).import).toHaveText('Import 23 people');
  });
});
