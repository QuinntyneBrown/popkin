// Acceptance Test
// Traces to: L2-132, L2-123 AC5
// Description: Deleting a contact asks first, then removes them and opens People.
import { chidiProfile, contactsMorning, recordedContactId } from '../fixtures/contacts';
import { expect, test } from '../fixtures/pk-test';
import { failNetwork, hold } from '../fixtures/stubs';
import { ContactActionsDialog } from '../pages/contact-actions.dialog';
import { ContactFormPage } from '../pages/contact-form.page';
import { ContactProfilePage } from '../pages/contact-profile.page';
import { DeleteContactDialog } from '../pages/delete-contact.dialog';

const chidi = () => recordedContactId('Chidi Okafor');
const deleteKey = () => `DELETE /api/contacts/people/${chidi()}` as const;

async function askToDelete(page: import('@playwright/test').Page): Promise<DeleteContactDialog> {
  await new ContactProfilePage(page).more.click();
  await new ContactActionsDialog(page).item('Delete Chidi').click();
  return new DeleteContactDialog(page);
}

test.describe('Delete a contact', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: contactsMorning });
    await chidiProfile(page);
  });

  // L2-132 AC1
  test('asks first, saying what goes and that Popkins don’t change', async ({ page, pk }) => {
    await pk.open('deleteContact');
    const dialog = await askToDelete(page);

    await expect(dialog.heading).toHaveText('Delete Chidi?');
    await expect(dialog.description).toHaveText(
      'Chidi’s profile and 1 follow-up go for good. Your Popkins don’t change, and Chidi isn’t told.',
    );
    await expect(dialog.confirm('Chidi')).toBeVisible();
    await expect(dialog.keep('Chidi')).toBeFocused();
  });

  // L2-132 AC1
  test('Keep Chidi keeps the profile', async ({ page, pk }) => {
    await pk.open('deleteContact');
    const dialog = await askToDelete(page);

    await dialog.keep('Chidi').click();

    await expect(dialog.root).toBeHidden();
    await expect(page).toHaveURL(`/contacts/people/${chidi()}`);
  });

  // L2-132 AC2
  test('Delete Chidi removes him and opens People', async ({ page, pk }) => {
    await pk.open('deleteContact');
    const dialog = await askToDelete(page);
    const sent = page.waitForRequest(
      (r) => r.method() === 'DELETE' && r.url().endsWith(`/api/contacts/people/${chidi()}`),
    );

    await dialog.confirm('Chidi').click();

    await sent;
    await expect(page).toHaveURL('/contacts/people');
  });

  // L2-123 AC5
  test('while deleting, the button reads Deleting… and is disabled', async ({ page, pk }) => {
    await hold(page, deleteKey());
    await pk.open('deleteContactBusy');
    const dialog = await askToDelete(page);

    await dialog.confirm('Chidi').click();

    await expect(dialog.deleting).toBeDisabled();
    await expect(dialog.keep('Chidi')).toBeVisible();
  });

  // L2-132 AC3
  test('a failed delete says nothing was removed and offers it again', async ({ page, pk }) => {
    await failNetwork(page, deleteKey());
    await pk.open('deleteContactFailed');
    const dialog = await askToDelete(page);

    await dialog.confirm('Chidi').click();

    await expect(dialog.alert).toHaveText(
      /We couldn’t delete Chidi\.\s*Nothing was removed\. Check your connection and try again\./,
    );
    await expect(dialog.confirm('Chidi')).toBeEnabled();
  });

  // L2-132 AC1
  test('Delete Chidi from Edit opens the same dialog', async ({ page, pk }) => {
    await pk.open('editContactOfChidi');
    const form = new ContactFormPage(page);

    await expect(form.delete).toHaveText('Delete Chidi');
    await form.delete.click();

    await expect(new DeleteContactDialog(page).heading).toHaveText('Delete Chidi?');
  });
});
