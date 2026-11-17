// Acceptance Test
// Traces to: L2-136, L2-135 AC1, known gap 107 (ruled)
// Description: Photos, files and notes are kept about a contact on their profile's Memories &
// files, added through Add to {first name}'s memories; a photo is on their timeline.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  chidiProfile,
  chidisMemories,
  chidisMemoriesKey,
  contactsMorning,
  femiProfile,
  recordedContactId,
  serveMemoryPhotos,
} from '../fixtures/contacts';
import { expect, test } from '../fixtures/pk-test';
import { failNetwork, hold, answer, problem } from '../fixtures/stubs';
import responses from '../fixtures/api/responses.json';
import { AddMemoryDialog } from '../pages/add-memory.dialog';
import { ContactProfilePage } from '../pages/contact-profile.page';
import { LogEntryPage } from '../pages/log-entry.page';

const chidi = () => recordedContactId('Chidi Okafor');
const memories = () => `/api/contacts/people/${chidi()}/memories`;
const MB = 1024 * 1024;
const lake = readFileSync(join(__dirname, '../../docs/mocks/assets/images/lake.jpg'));

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: contactsMorning });
});

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The note "Add to memories" saved when the answers were recorded. */
function recordedNote(): { updatedOn: string } {
  const all = responses as Record<string, { body?: unknown }>;
  const key = Object.keys(all).find((k) =>
    /^POST \/api\/contacts\/people\/[^/]+\/memories\/notes$/.test(k),
  );
  return all[key!].body as { updatedOn: string };
}

test.describe('Memories & files', () => {
  // L2-136 AC1
  test('lists the photos with their caption and day, files with their month and size, and notes', async ({
    page,
    pk,
  }) => {
    await chidiProfile(page);
    await chidisMemories(page);
    await pk.open('contactProfileMemories');
    const profile = new ContactProfilePage(page);

    await expect(profile.memoriesIntro).toHaveText(
      'Photos, files and notes you’ve kept about Chidi. Private to you.',
    );
    await expect(profile.addMemory).toBeVisible();
    await expect(profile.memoryPhotos).toHaveText([
      'Hot sauce night · Aug 8',
      'Ridge trail · Jul 19',
      'Lakeside, the dock · Jul 18',
      'Wedding day bonfire · Sep 26, 2021',
    ]);
    await expect(profile.memoryRows.locator('.row__title')).toHaveText([
      'Dad’s recipe for egusi.jpg',
      'Wedding speech.pdf',
      'Gift ideas: Fela reissue on vinyl, Dishoom cookbook, bike lights',
    ]);
    await expect(profile.memoryRows.locator('.row__text')).toHaveText([
      'Dec 2022 · 2.1 MB',
      'Sep 2021 · 84 KB',
      'Updated Aug 31',
    ]);
    await expect(
      profile.memoryRows.getByRole('link', { name: 'Wedding speech.pdf' }),
    ).toHaveAttribute('download', 'Wedding speech.pdf');
  });

  // L2-136 AC1: nothing kept yet
  test('with nothing kept, it offers Add alone', async ({ page, pk }) => {
    await femiProfile(page);
    await pk.open('contactProfileEmpty');
    const profile = new ContactProfilePage(page);

    await profile.historyTabs.filter({ hasText: 'Memories & files' }).click();

    await expect(profile.memoriesIntro).toHaveText(
      'Photos, files and notes you’ve kept about Femi. Private to you.',
    );
    await expect(profile.addMemory).toBeVisible();
    await expect(profile.memoryGrid).toHaveCount(0);
    await expect(profile.memoryList).toHaveCount(0);
  });

  test('says so when they cannot be read, and Try again reads them', async ({ page, pk }) => {
    await chidiProfile(page);
    await failNetwork(page, chidisMemoriesKey());
    await pk.open('contactProfileMemories');
    const profile = new ContactProfilePage(page);

    await expect(profile.memoriesFailed).toHaveText('We couldn’t load Chidi’s memories');
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await chidiProfile(page);
    await chidisMemories(page);
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(profile.memoryPhotos).toHaveCount(4);
  });

  // L2-135 AC1, gap 107: a photo memory is on the timeline under All
  test('a photo memory is on the timeline, by its day, with its caption and photo', async ({
    page,
    pk,
  }) => {
    await chidiProfile(page);
    await serveMemoryPhotos(page);
    await pk.open('contactProfile');
    const profile = new ContactProfilePage(page);

    await expect(profile.timelineEntries).toHaveCount(3);
    const memory = profile.timelineEntries.nth(2);
    await expect(memory.locator('.contact-timeline__date')).toHaveText('Aug 8');
    await expect(memory.getByRole('heading', { level: 3 })).toHaveText('Hot sauce night');
    await expect(memory.getByRole('img', { name: 'Hot sauce night' })).toBeVisible();
  });
});

test.describe('Add to memories', () => {
  test.beforeEach(async ({ page }) => {
    await chidiProfile(page);
    await chidisMemories(page);
    await serveMemoryPhotos(page);
  });

  // L2-136 AC2
  test('offers Photo, File or Note, and for a photo Choose a photo and Caption', async ({
    page,
    pk,
  }) => {
    await pk.open('contactProfileMemories');
    const dialog = new AddMemoryDialog(page);

    await new ContactProfilePage(page).addMemory.click();

    await expect(dialog.heading).toHaveText('Add to Chidi’s memories');
    await expect(dialog.whatToAdd.getByRole('radio')).toHaveText(['Photo', 'File', 'Note']);
    await expect(dialog.option('Photo')).toHaveAttribute('aria-checked', 'true');
    await expect(dialog.choose).toHaveText('Choose a photo');
    await expect(dialog.caption).toBeVisible();
    await expect(dialog.captionHint).toBeVisible();
    await expect(dialog.save).toHaveText('Save');
  });

  // L2-136 AC3
  test('a photo over 25 MB is refused when it is chosen, with Choose another photo', async ({
    page,
    pk,
  }) => {
    await pk.open('contactProfileMemories');
    const dialog = new AddMemoryDialog(page);
    await new ContactProfilePage(page).addMemory.click();

    await dialog.fileInput.setInputFiles({
      name: 'IMG_4471.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.alloc(32 * MB),
    });

    await expect(dialog.summary.getByRole('link')).toHaveText([
      'Photo: that one is 32 MB; choose one up to 25 MB.',
    ]);
    await expect(dialog.fileError).toHaveText('That photo is 32 MB. A photo can be up to 25 MB.');
    await expect(dialog.choose).toHaveText('Choose another photo');
    await expect(dialog.choose).toHaveAttribute('aria-invalid', 'true');
  });

  // L2-136 AC4
  test('a photo uploading names the file, how much is sent and a progress bar', async ({
    page,
    pk,
  }) => {
    const release = await hold(page, `POST ${memories()}/photos`);
    await pk.open('contactProfileMemories');
    const dialog = new AddMemoryDialog(page);
    await new ContactProfilePage(page).addMemory.click();
    await dialog.fileInput.setInputFiles({
      name: 'IMG_4471.jpg',
      mimeType: 'image/jpeg',
      buffer: lake,
    });
    await dialog.caption.fill('Lakeside, the canoe');

    await dialog.save.click();

    await expect(dialog.uploadName).toHaveText('IMG_4471.jpg');
    await expect(dialog.uploadStatus).toHaveText(/^Uploading · \d+\.\d of \d+\.\d MB$/);
    await expect(dialog.progress).toHaveAccessibleName('Uploading IMG_4471.jpg');
    await expect(dialog.save).toHaveText('Uploading…');
    await expect(dialog.save).toBeDisabled();
    release();
    await expect(dialog.root).toHaveCount(0);
  });

  test('a saved photo is first on the tab', async ({ page, pk }) => {
    await pk.open('contactProfileMemories');
    const profile = new ContactProfilePage(page);
    const dialog = new AddMemoryDialog(page);
    await profile.addMemory.click();
    await dialog.fileInput.setInputFiles({
      name: 'IMG_4471.jpg',
      mimeType: 'image/jpeg',
      buffer: lake,
    });
    await dialog.caption.fill('Hot sauce night');

    await dialog.save.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(profile.memoryPhotos).toHaveCount(5);
    await expect(profile.memoryPhotos.first()).toHaveText('Hot sauce night · Aug 8');
    await expect(profile.addMemory).toBeFocused();
  });

  test('a photo the API cannot read is refused at the field', async ({ page, pk }) => {
    await answer(page, `POST ${memories()}/photos`, problem(400, 'photo_type_not_allowed'));
    await pk.open('contactProfileMemories');
    const dialog = new AddMemoryDialog(page);
    await new ContactProfilePage(page).addMemory.click();
    await dialog.fileInput.setInputFiles({
      name: 'scan.jpg',
      mimeType: 'image/jpeg',
      buffer: lake,
    });
    await expect(dialog.upload).toBeVisible();

    await dialog.save.click();

    await expect(dialog.summary.getByRole('link')).toHaveText([
      'Photo: choose a JPEG, PNG, WebP or HEIC image.',
    ]);
    await expect(dialog.fileError).toHaveText('A photo must be a JPEG, PNG, WebP or HEIC image.');
    await expect(dialog.panel).toBeVisible();
  });

  // Gap 107, ruled: a file
  test('a file is chosen and kept, first among the files', async ({ page, pk }) => {
    await pk.open('contactProfileMemories');
    const profile = new ContactProfilePage(page);
    const dialog = new AddMemoryDialog(page);
    await profile.addMemory.click();

    await dialog.option('File').click();
    await expect(dialog.choose).toHaveText('Choose a file');
    await expect(dialog.fileHint).toHaveText(
      'A PDF, a document, a spreadsheet or a picture, up to 25 MB. Only you can see it.',
    );
    await expect(dialog.caption).toHaveCount(0);
    await dialog.fileInput.setInputFiles({
      name: 'Wedding speech.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.7\n'),
    });
    await expect(dialog.uploadName).toHaveText('Wedding speech.pdf');
    await dialog.save.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(profile.memoryRows.locator('.row__title')).toHaveText([
      'Wedding speech.pdf',
      'Dad’s recipe for egusi.jpg',
      'Wedding speech.pdf',
      'Gift ideas: Fela reissue on vinyl, Dishoom cookbook, bike lights',
    ]);
  });

  // Gap 107, ruled: a note
  test('a note needs words, then is kept first among the notes', async ({ page, pk }) => {
    await pk.open('contactProfileMemories');
    const profile = new ContactProfilePage(page);
    const dialog = new AddMemoryDialog(page);
    await profile.addMemory.click();

    await dialog.option('Note').click();
    await expect(dialog.noteHint).toBeVisible();
    await dialog.save.click();
    await expect(dialog.summary.getByRole('link')).toHaveText(['Note: write the note.']);
    await expect(dialog.note).toHaveAttribute('aria-invalid', 'true');
    await dialog.note.fill('Gift ideas: Fela reissue on vinyl, Dishoom cookbook, bike lights');
    await dialog.save.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(profile.memoryRows).toHaveCount(4);
    // The note is dated by the API's day when it was recorded.
    const [, month, day] = recordedNote().updatedOn.split('-').map(Number);
    await expect(profile.memoryRows.nth(2).locator('.row__text')).toHaveText(
      `Updated ${MONTHS[month - 1]} ${day}`,
    );
  });

  test('a failure keeps the note, and says so', async ({ page, pk }) => {
    await failNetwork(page, `POST ${memories()}/notes`);
    await pk.open('contactProfileMemories');
    const dialog = new AddMemoryDialog(page);
    await new ContactProfilePage(page).addMemory.click();
    await dialog.option('Note').click();
    await dialog.note.fill('Bike lights');

    await dialog.save.click();

    await expect(dialog.failed).toBeVisible();
    await expect(dialog.note).toHaveValue('Bike lights');
    await expect(dialog.save).toBeEnabled();
  });
});

test.describe('A milestone’s photo', () => {
  // Gap 107, ruled: the photo is kept as a memory of what happened, on the milestone's day
  test('is sent once the milestone is saved, captioned with what happened', async ({
    page,
    pk,
  }) => {
    await chidiProfile(page);
    await pk.open('logEntryMilestone');
    const log = new LogEntryPage(page);
    await log.what.fill('Started as Senior Engineer at Arup');
    await log.whenDay.fill('2026-08-31');
    await expect(log.photo).toHaveAccessibleName('Photo Add a photo');
    await log.photoInput.setInputFiles({ name: 'arup.jpg', mimeType: 'image/jpeg', buffer: lake });
    await expect(log.photo).toHaveText('arup.jpg');
    const sent = page.waitForRequest(
      (request) => request.method() === 'POST' && request.url().endsWith('/memories/photos'),
    );

    await log.save.click();

    const form = (await sent).postData() ?? '';
    expect(form).toContain('Started as Senior Engineer at Arup');
    expect(form).toContain('2026-08-31');
    await expect(page).toHaveURL(new RegExp(`/contacts/people/${chidi()}$`));
  });

  test('over 25 MB is refused before anything is sent', async ({ page, pk }) => {
    await chidiProfile(page);
    await pk.open('logEntryMilestone');
    const log = new LogEntryPage(page);

    await log.photoInput.setInputFiles({
      name: 'big.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.alloc(26 * MB),
    });

    await expect(log.photoError).toHaveText('That photo is 26 MB. A photo can be up to 25 MB.');
  });

  test('that fails leaves the milestone saved, and says so', async ({ page, pk }) => {
    await chidiProfile(page);
    await failNetwork(page, `POST ${memories()}/photos`);
    await pk.open('logEntryMilestone');
    const log = new LogEntryPage(page);
    await log.what.fill('Started as Senior Engineer at Arup');
    await log.whenDay.fill('2026-08-31');
    await log.photoInput.setInputFiles({ name: 'arup.jpg', mimeType: 'image/jpeg', buffer: lake });

    await log.save.click();

    await expect(log.alert).toContainText('We couldn’t add the photo.');
    await expect(log.alert).toContainText('Chidi’s milestone is saved.');
    await expect(log.what).toHaveValue('Started as Senior Engineer at Arup');
  });
});
