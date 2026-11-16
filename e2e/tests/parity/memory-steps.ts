import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  chidiProfile,
  chidisMemories,
  contactsMorning,
  serveMemoryPhotos,
} from '../../fixtures/contacts';
import { AddMemoryDialog } from '../../pages/add-memory.dialog';
import { ContactProfilePage } from '../../pages/contact-profile.page';

const lake = readFileSync(join(__dirname, '../../../docs/mocks/assets/images/lake.jpg'));

/** Chidi's profile and memories on the mocks' morning. */
export async function memoriesAsDrawn(page: Page): Promise<void> {
  await page.clock.install({ time: contactsMorning });
  await chidiProfile(page);
  await chidisMemories(page);
  await serveMemoryPhotos(page);
}

/** Add, as the dialog mocks open it. */
export async function openAdd(page: Page): Promise<AddMemoryDialog> {
  await new ContactProfilePage(page).addMemory.click();
  const dialog = new AddMemoryDialog(page);
  await dialog.heading.waitFor();
  return dialog;
}

/** The canoe on the lake, chosen as IMG_4471.jpg, captioned as the mocks draw it. */
export async function chooseTheCanoe(page: Page): Promise<void> {
  const dialog = await openAdd(page);
  await dialog.fileInput.setInputFiles({
    name: 'IMG_4471.jpg',
    mimeType: 'image/jpeg',
    buffer: lake,
  });
  await dialog.caption.fill('Lakeside, the canoe');
}

/** A 32 MB photo chosen, as invalid.html draws it. */
export async function chooseTooLarge(page: Page): Promise<void> {
  const dialog = await openAdd(page);
  await dialog.fileInput.setInputFiles({
    name: 'IMG_4471.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.alloc(32 * 1024 * 1024),
  });
  await dialog.caption.fill('Lakeside, the canoe');
}
