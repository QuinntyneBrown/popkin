// Acceptance Test
// Traces to: L2-122
// Description: A link to a contact that is not in the person's own Contacts discloses nothing and offers only People.
import { recordedContactId } from '../fixtures/contacts';
import { expect, test } from '../fixtures/pk-test';
import { answer, problem } from '../fixtures/stubs';
import { ContactProfilePage } from '../pages/contact-profile.page';

const chidi = () => recordedContactId('Chidi Okafor');
const NOT_FOUND = [
  'This person isn’t in your contacts',
  'They may have been deleted, or the link came from someone else’s contacts. Only you can see yours.',
];

test.describe('Only you see your Contacts', () => {
  // L2-122 AC2
  test('a contact not in my Contacts reads as not there, with Go to People and nothing else', async ({
    page,
    pk,
  }) => {
    await answer(page, `GET /api/contacts/people/${chidi()}`, problem(404, 'contact_not_found'));
    await pk.open('contactProfileNotFound');

    const profile = new ContactProfilePage(page);
    await expect(profile.stateHeading).toHaveText(NOT_FOUND[0]);
    await expect(profile.stateText).toHaveText(NOT_FOUND[1]);
    await expect(profile.goToPeople).toHaveAttribute('href', '/contacts/people');
    await expect(profile.edit).toHaveCount(0);
    await expect(profile.more).toHaveCount(0);
  });

  // L2-122 AC2
  test('an address that cannot name a contact is not asked for', async ({ page }) => {
    await page.goto('/contacts/people/not-a-contact');

    await expect(new ContactProfilePage(page).stateHeading).toHaveText(NOT_FOUND[0]);
  });

  // L2-122 AC2
  test('editing a contact not in my Contacts reads as not there too', async ({ page }) => {
    await answer(page, `GET /api/contacts/people/${chidi()}`, problem(404, 'contact_not_found'));
    await page.goto(`/contacts/people/${chidi()}/edit`);

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(NOT_FOUND[0]);
    await expect(page.getByRole('link', { name: 'Go to People' })).toBeVisible();
  });
});
