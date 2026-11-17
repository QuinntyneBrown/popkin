// Acceptance Test
// Traces to: L2-121
// Description: My Popkins offers Contacts while it is switched on, and the app keeps it closed otherwise.
import { contactsMorning, contactsOff, contactsUnknown } from '../fixtures/contacts';
import { marasToday } from '../fixtures/today';
import { expect, test } from '../fixtures/pk-test';
import { ContactsTodayPage } from '../pages/contacts-today.page';
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

test.describe('the Contacts navigation', () => {
  // L2-121 AC2
  test('Contacts on My Popkins opens Today', async ({ page, pk }) => {
    await pk.open('myPopkins');

    await new MyPopkinsPage(page).contacts.click();

    const today = new ContactsTodayPage(page);
    await expect(today.root).toBeVisible();
    await expect(page).toHaveURL(/\/contacts$/);
  });

  // L2-121 AC3
  test('names Contacts, leads back to Your Popkins and marks Today', async ({ page, pk }) => {
    await page.setViewportSize({ width: 1280, height: 900 });

    await pk.open('contactsTodayEmpty');

    const nav = new ContactsTodayPage(page).nav;
    await expect(nav.name).toHaveText('Contacts');
    await expect(nav.countLine).toHaveText('ContactsOnly you can see them');
    await expect(nav.back).toHaveAttribute('href', '/popkins');
    await expect(nav.tabNames).toHaveText([
      'Today',
      'People',
      'Dates',
      'Follow-ups',
      'Habits',
      'Groups',
      'Connections',
    ]);
    await expect(nav.current).toHaveText('Today');
    await expect(nav.tab('People')).toHaveAttribute('href', '/contacts/people');
    await expect(nav.tab('Connections')).toHaveAttribute('href', '/contacts/connections');
  });

  // L2-121 AC3
  test('counts the people kept', async ({ page, pk }) => {
    await page.clock.install({ time: contactsMorning });
    await marasToday(page);

    await pk.open('contactsToday');

    await expect(new ContactsTodayPage(page).nav.countLine).toHaveText(
      'Contacts13 people · only you',
    );
  });

  // L2-121 AC4
  test('offers five tabs on a phone', async ({ page, pk }) => {
    await page.setViewportSize({ width: 360, height: 800 });

    await pk.open('contactsTodayEmpty');

    const nav = new ContactsTodayPage(page).nav;
    await expect(nav.tabNames.locator('visible=true')).toHaveText([
      'Today',
      'People',
      'Dates',
      'Follow-ups',
      'Groups',
    ]);
  });
});

test.describe('Contacts while it is closed', () => {
  // ADR 0023: the API owns the switch and the app asks before the page opens.
  test('with Contacts switched off, /contacts goes back to My Popkins', async ({ page, pk }) => {
    await contactsOff(page);

    await pk.open('contactsTodayEmpty');

    await expect(new MyPopkinsPage(page).root).toBeVisible();
    await expect(new ContactsTodayPage(page).root).toHaveCount(0);
  });

  // ADR 0023: the safe answer is off
  test('when the API cannot say, /contacts goes back to My Popkins', async ({ page, pk }) => {
    await contactsUnknown(page);

    await pk.open('contactsTodayEmpty');

    await expect(new MyPopkinsPage(page).root).toBeVisible();
  });
});
