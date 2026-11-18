// Acceptance Test
// Traces to: L2-180, L2-181
// Description: Added says the contact is kept, offers more about them, the next person or done, and counts the people added since Quick Add opened.
import { contactsMorning } from '../fixtures/contacts';
import { expect, test } from '../fixtures/pk-test';
import { answer, recordedBody } from '../fixtures/stubs';
import { ContactAddedPage } from '../pages/contact-added.page';
import { QuickAddPage } from '../pages/quick-add.page';
import type { Page } from '@playwright/test';

const femi = () => recordedBody<{ id: string }>('POST /api/contacts/people');

/** Opens Quick Add and saves Femi, as the recording answers. */
async function addFemi(page: Page): Promise<void> {
  const quick = new QuickAddPage(page);
  await quick.name.fill('Femi Bankole');
  await quick.save.click();
  await expect(page).toHaveURL(`/contacts/people/${femi().id}/added`);
}

test.describe('Added', () => {
  // L2-180 AC1, AC2; L2-181 AC2
  test('shows them with a tick, their circle and who they are, with no count for the first', async ({
    page,
    pk,
  }) => {
    await pk.open('quickAdd');

    await addFemi(page);

    const added = new ContactAddedPage(page);
    await expect(added.heading).toHaveText('Femi’s in your contacts');
    await expect(added.heading).toBeFocused();
    await expect(added.avatar).toContainText('FB');
    await expect(added.tick).toBeVisible();
    await expect(added.line).toHaveText('Friends · Grace’s fiancé');
    await expect(added.addMore).toContainText('Now, or whenever you’re ready');
    await expect(added.done).toBeVisible();
    await expect(added.addAnother).toBeVisible();
    await expect(added.count).toHaveCount(0);
  });

  // L2-180 AC1
  test('with no Who are they?, the line is the circle alone', async ({ page, pk }) => {
    const saved = recordedBody<Record<string, unknown>>('POST /api/contacts/people');
    await answer(page, 'POST /api/contacts/people', {
      status: 201,
      body: { ...saved, knownAs: null, circle: 'Work' },
    });
    await pk.open('quickAdd');

    await addFemi(page);

    await expect(new ContactAddedPage(page).line).toHaveText('Work');
  });

  // L2-180 AC3
  test('Add a birthday, how you met… opens Edit for them', async ({ page, pk }) => {
    await pk.open('quickAdd');
    await addFemi(page);

    await new ContactAddedPage(page).addMore.click();

    await expect(page).toHaveURL(`/contacts/people/${femi().id}/edit`);
  });

  // L2-180 AC4
  test('Done opens Today', async ({ page, pk }) => {
    await page.clock.install({ time: contactsMorning });
    await pk.open('quickAdd');
    await addFemi(page);

    await new ContactAddedPage(page).done.click();

    await expect(page).toHaveURL('/contacts');
  });

  // L2-181 AC1, AC2
  test('Add another opens Quick Add empty, and the next one counts two', async ({ page, pk }) => {
    await pk.open('quickAdd');
    await addFemi(page);
    const added = new ContactAddedPage(page);

    await added.addAnother.click();

    const quick = new QuickAddPage(page);
    await expect(page).toHaveURL('/contacts/quick-add');
    await expect(quick.name).toHaveValue('');
    await expect(quick.name).toBeFocused();
    await expect(quick.circleChoice('Friends')).toHaveAttribute('aria-checked', 'true');
    await addFemi(page);
    await expect(added.count).toHaveText('2 people added today');
  });

  // L2-181 AC2
  test('Quick Add opened afresh starts counting again', async ({ page, pk }) => {
    await pk.open('quickAdd');
    await addFemi(page);
    const added = new ContactAddedPage(page);
    await added.addAnother.click();
    await addFemi(page);
    await expect(added.count).toHaveText('2 people added today');

    await pk.open('quickAdd');
    await addFemi(page);

    await expect(added.count).toHaveCount(0);
  });

  // L2-180 AC1, on a direct visit
  test('opened by its address, reads the contact and shows no count', async ({ page, pk }) => {
    await pk.open('contactAdded');

    const added = new ContactAddedPage(page);
    await expect(added.heading).toHaveText('Femi’s in your contacts');
    await expect(added.line).toHaveText('Friends · Grace’s fiancé');
    await expect(added.count).toHaveCount(0);
  });
});
