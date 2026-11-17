import type { Page } from '@playwright/test';
import { marasConnections, peopleOfTheMap } from '../../fixtures/connections';
import { contactsMorning, peopleKey } from '../../fixtures/contacts';
import { answer } from '../../fixtures/stubs';
import { ConnectPersonDialog } from '../../pages/connect-person.dialog';
import { ContactsConnectionsPage } from '../../pages/contacts-connections.page';

/** Mara's map on the mocks' morning, as Connections draws it. */
export async function connectionsAsDrawn(page: Page): Promise<void> {
  await page.clock.install({ time: contactsMorning });
  await answer(page, peopleKey, { status: 200, body: peopleOfTheMap() });
  await marasConnections(page);
}

/** Chidi chosen, as default.html draws him. */
export async function chooseChidi(page: Page): Promise<ContactsConnectionsPage> {
  const connections = new ContactsConnectionsPage(page);
  await connections.face('Chidi Okafor').click();
  await connections.panelHeading.filter({ hasText: 'Chidi Okafor' }).waitFor();
  return connections;
}

/** Connect for Chidi with Ada chosen and "Mum" in her words, as the dialog's default draws it. */
export async function connectChidiToAda(page: Page): Promise<ConnectPersonDialog> {
  const connections = await chooseChidi(page);
  await connections.connect.click();
  const dialog = new ConnectPersonDialog(page);
  await dialog.person('Ada Okafor').click();
  await dialog.words.fill('Mum');
  return dialog;
}
