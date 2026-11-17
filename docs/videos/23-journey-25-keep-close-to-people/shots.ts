import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { marasConnections } from '../../../e2e/fixtures/connections';
import {
  chidiProfile,
  chidisMemories,
  contactsMorning,
  marasDates,
  marasFollowUps,
  marasHabits,
  marasPeople,
  nobodyInPeople,
  serveMemoryPhotos,
} from '../../../e2e/fixtures/contacts';
import { marasGroups } from '../../../e2e/fixtures/groups';
import { marasCandidates } from '../../../e2e/fixtures/import';
import { type Pk, test } from '../../../e2e/fixtures/pk-test';
import { gracesReminder, marasReminders } from '../../../e2e/fixtures/reminders';
import type { RouteKey } from '../../../e2e/fixtures/routes';
import { marasToday } from '../../../e2e/fixtures/today';
import { ContactProfilePage } from '../../../e2e/pages/contact-profile.page';
import { ContactsConnectionsPage } from '../../../e2e/pages/contacts-connections.page';
import { ContactsGroupsPage } from '../../../e2e/pages/contacts-groups.page';
import { ContactsHabitsPage } from '../../../e2e/pages/contacts-habits.page';
import { ContactsPeoplePage } from '../../../e2e/pages/contacts-people.page';
import { ContactsTodayPage } from '../../../e2e/pages/contacts-today.page';
import { ImportContactsDialog } from '../../../e2e/pages/import-contacts.dialog';
import { detail, frame, shot, type Size, type Theme } from '../../../tools/video-record/shots';

/**
 * The screenshots of video 23: journey 25, Keep close to people (Contacts), in the running app.
 * Mara's Contacts are the mocks' people on their Tuesday morning, 15 September. Every /api
 * request is answered in memory by the fixtures of `e2e/` or the recording (ADR 0005); no backend
 * and no database ran. Not a test and not a sweep: only
 * `node tools/video-record/record.mjs docs/videos/23-journey-25-keep-close-to-people` runs it.
 */

async function pictures(page: Page): Promise<void> {
  await page.evaluate(() =>
    Promise.all(
      [...document.images].map((image) => image.complete || image.decode().catch(() => undefined)),
    ),
  );
}

/** Opens a state on the mocks' morning, at a size and a theme, once its pictures are drawn. */
async function open(
  page: Page,
  pk: Pk,
  key: RouteKey,
  size: Size,
  serve: (page: Page) => Promise<unknown>,
  theme: Theme = 'light',
): Promise<void> {
  await page.clock.install({ time: contactsMorning });
  await frame(page, size, theme);
  await serve(page);
  await pk.open(key);
  await page.waitForLoadState('networkidle');
  await pictures(page);
}

const today = (page: Page) => marasToday(page);
const profile = (page: Page) => chidiProfile(page);
const memories = async (page: Page) => {
  await chidiProfile(page);
  await chidisMemories(page);
  await serveMemoryPhotos(page);
};

for (const size of ['XS', 'M', 'L', 'XL'] as const) {
  test(`Today at ${size}`, async ({ page, pk }) => {
    await open(page, pk, 'contactsToday', size, today);
    await expect(new ContactsTodayPage(page).spotlightHeading).toHaveText('Grace’s birthday');
    await shot(page, `today-${size.toLowerCase()}`);
  });
}

test('Today, close up and in the dark', async ({ page, pk }) => {
  await open(page, pk, 'contactsToday', 'XS', today, 'dark');
  await shot(page, 'today-xs-dark');
  await open(page, pk, 'contactsToday', 'XL', today);
  const view = new ContactsTodayPage(page);
  await detail(view.spotlight, 'spotlight', 12);
  await detail(view.toDo, 'to-do', 12);
  await detail(view.drift, 'drift', 12);
});

test('a reminder on Today', async ({ page, pk }) => {
  await open(page, pk, 'contactsReminder', 'XS', async (p) => {
    await marasToday(p);
    await marasReminders(p, [gracesReminder()]);
  });
  await shot(page, 'reminder-xs');
});

test('People', async ({ page, pk }) => {
  await open(page, pk, 'contactsPeople', 'XS', marasPeople);
  await expect(new ContactsPeoplePage(page).heading).toBeVisible();
  await shot(page, 'people-xs');
  await open(page, pk, 'contactsPeople', 'XL', marasPeople);
  await shot(page, 'people-xl');
});

test('adding someone', async ({ page, pk }) => {
  await open(page, pk, 'addContact', 'XS', async () => undefined);
  await shot(page, 'add-xs');
});

test('a profile', async ({ page, pk }) => {
  await open(page, pk, 'contactProfile', 'XS', profile);
  const chidi = new ContactProfilePage(page);
  await expect(chidi.name).toHaveText('Chidi Okafor');
  await shot(page, 'profile-xs');
  await open(page, pk, 'contactProfile', 'XL', profile);
  await shot(page, 'profile-xl');
  await detail(chidi.keyDates, 'key-dates', 12);
  await detail(chidi.habit, 'habit', 12);
});

test('logging a conversation', async ({ page, pk }) => {
  await open(page, pk, 'logEntry', 'XS', profile);
  await shot(page, 'log-xs');
});

test('memories', async ({ page, pk }) => {
  await open(page, pk, 'contactProfileMemories', 'XS', memories);
  await shot(page, 'memories-xs');
  await open(page, pk, 'contactProfileMemories', 'XL', memories);
  await shot(page, 'memories-xl');
});

test('dates and follow-ups', async ({ page, pk }) => {
  await open(page, pk, 'contactsDates', 'XS', marasDates);
  await shot(page, 'dates-xs');
  await open(page, pk, 'contactsDates', 'XL', marasDates);
  await shot(page, 'dates-xl');
  await open(page, pk, 'contactsFollowUps', 'XS', marasFollowUps);
  await shot(page, 'follow-ups-xs');
  await open(page, pk, 'contactsFollowUps', 'XL', marasFollowUps);
  await shot(page, 'follow-ups-xl');
});

test('habits', async ({ page, pk }) => {
  await open(page, pk, 'contactsHabits', 'XS', marasHabits);
  const habits = new ContactsHabitsPage(page);
  await expect(habits.leadTitle).toHaveText('Lunch with Chidi');
  await shot(page, 'habits-xs');
  await detail(habits.lead, 'habit-lead', 12);
  await open(page, pk, 'contactsHabits', 'XL', marasHabits);
  await shot(page, 'habits-xl');
});

test('connections and groups', async ({ page, pk }) => {
  await open(page, pk, 'contactsConnections', 'XL', marasConnections);
  await expect(new ContactsConnectionsPage(page).map).toBeVisible();
  await shot(page, 'connections-xl');
  await open(page, pk, 'contactsConnections', 'XS', marasConnections);
  await shot(page, 'connections-xs');
  await open(page, pk, 'contactsGroupsDetail', 'XL', marasGroups);
  await expect(new ContactsGroupsPage(page).name).toBeVisible();
  await shot(page, 'groups-xl');
  await open(page, pk, 'contactsGroups', 'XS', marasGroups);
  await shot(page, 'groups-xs');
});

for (const size of ['XS', 'XL'] as const) {
  test(`Import from your Popkins at ${size}`, async ({ page, pk }) => {
    await open(page, pk, 'contactsPeopleEmpty', size, async (p) => {
      await marasCandidates(p);
      await nobodyInPeople(p);
    });
    await new ContactsPeoplePage(page).importPeople.click();
    const dialog = new ImportContactsDialog(page);
    await expect(dialog.import).toHaveText('Import 23 people');
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await pictures(page);
    await shot(page, `import-${size.toLowerCase()}`);
    if (size === 'XS') {
      await detail(dialog.description, 'import-told', 12);
      await detail(dialog.import, 'import-button', 12);
    }
  });
}
