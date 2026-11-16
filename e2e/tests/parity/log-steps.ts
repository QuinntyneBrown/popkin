import type { Page } from '@playwright/test';
import { chidiProfile, contactsMorning } from '../../fixtures/contacts';
import { AddPromiseDialog } from '../../pages/add-promise.dialog';
import { LogEntryPage } from '../../pages/log-entry.page';

/** Log as default.html draws it, on the mocks' morning: a phone call with Chidi. */
export async function logAsDrawn(page: Page): Promise<void> {
  await page.clock.install({ time: contactsMorning });
  await chidiProfile(page);
}

/** What default.html draws typed in: Phone, the note and the promise. */
export async function fillAsDrawn(page: Page): Promise<void> {
  const log = new LogEntryPage(page);
  const dialog = new AddPromiseDialog(page);
  await log.channel('Phone').click();
  await log.talk.fill(
    'He’s three weeks into Arup and finally sleeping again. Still hates the commute — they’ve seen two flats near Piccadilly. Tomás has won the dog argument: a rescue greyhound called Biscuit, arriving in October.',
  );
  await log.addPromise.click();
  await dialog.text.fill('Send him the flat-hunting checklist');
  await dialog.remind.fill('2026-09-17');
  await dialog.add.click();
  await dialog.root.waitFor({ state: 'hidden' });
  // The mock's note shows from its first line.
  await log.talk.evaluate((field) => (field.scrollTop = 0));
}
