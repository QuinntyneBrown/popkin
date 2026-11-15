// Acceptance Test
// Traces to: L2-121
// Description: My Popkins offers Contacts while it is switched on, and the app keeps it closed otherwise.
import { contactsOff, contactsUnknown } from '../fixtures/contacts';
import { expect, test } from '../fixtures/pk-test';
import { MyPopkinsPage } from '../pages/my-popkins.page';

test.describe('the way into Contacts', () => {
  // L2-121 AC1
  test('My Popkins offers Contacts beside New Popkin', async ({ page, pk }) => {
    await pk.open('myPopkins');

    const myPopkins = new MyPopkinsPage(page);
    await expect(myPopkins.contacts).toBeVisible();
    await expect(myPopkins.contacts).toHaveAttribute('href', '/contacts');
    await expect(myPopkins.contacts).toHaveAttribute('title', 'Contacts');
  });

  // L2-121 AC1, ADR 0023
  test('with Contacts switched off, My Popkins offers no Contacts', async ({ page, pk }) => {
    await contactsOff(page);

    await pk.open('myPopkins');

    const myPopkins = new MyPopkinsPage(page);
    await expect(myPopkins.cards.first()).toBeVisible();
    await expect(myPopkins.contacts).toHaveCount(0);
  });

  // ADR 0023: the safe answer is off
  test('when the API cannot say, My Popkins offers no Contacts', async ({ page, pk }) => {
    await contactsUnknown(page);

    await pk.open('myPopkins');

    const myPopkins = new MyPopkinsPage(page);
    await expect(myPopkins.cards.first()).toBeVisible();
    await expect(myPopkins.contacts).toHaveCount(0);
  });
});
