import { chidiProfile, contactsMorning } from '../../fixtures/contacts';
import { parity } from '../../fixtures/parity';
import { AddMemoryDialog } from '../../pages/add-memory.dialog';
import { LogEntryPage } from '../../pages/log-entry.page';
import { chooseTooLarge, memoriesAsDrawn, openAdd } from './memory-steps';

const chooser = (page: import('@playwright/test').Page) =>
  new AddMemoryDialog(page).root.locator('.memory-chooser');

parity('memory-chooser', [
  // "Choose a photo".
  {
    key: 'addMemory',
    name: 'photo',
    region: chooser,
    before: memoriesAsDrawn,
    app: async (page) => void (await openAdd(page)),
    snap: true,
  },
  // "Choose a file" with its hint.
  {
    key: 'addMemoryFile',
    name: 'file',
    region: chooser,
    before: memoriesAsDrawn,
    app: async (page) => {
      const dialog = await openAdd(page);
      await dialog.option('File').click();
    },
    snap: true,
  },
  // A photo over 25 MB: "Choose another photo" and why.
  {
    key: 'addMemoryInvalid',
    name: 'refused',
    region: chooser,
    before: memoriesAsDrawn,
    app: chooseTooLarge,
    snap: true,
  },
  // Log's "Photo", beside When.
  {
    key: 'logEntryMilestone',
    name: 'log',
    region: (page) => new LogEntryPage(page).form.locator('.memory-chooser'),
    before: async (page) => {
      await page.clock.install({ time: contactsMorning });
      await chidiProfile(page);
    },
    snap: true,
  },
]);
