// Acceptance Test
// Traces to: L2-125
// Description: Today greets the person and, with nobody in Contacts, asks who to keep close.
import { contactsMorning } from '../fixtures/contacts';
import { expect, test } from '../fixtures/pk-test';
import { ContactsTodayPage } from '../pages/contacts-today.page';

test.describe('Today with nobody in Contacts', () => {
  // L2-125 AC1
  test('greets Mara by the morning of her device', async ({ page, pk }) => {
    await page.clock.install({ time: contactsMorning });

    await pk.open('contactsTodayEmpty');

    const today = new ContactsTodayPage(page);
    await expect(today.heading).toHaveText('Morning, Mara');
    await expect(today.dateLine).toHaveText('Tuesday, 15 September');
  });

  // L2-125 AC8
  test('asks who to keep close and offers Add someone', async ({ page, pk }) => {
    await pk.open('contactsTodayEmpty');

    const today = new ContactsTodayPage(page);
    await expect(today.startHeading).toHaveText('Who do you want to keep close?');
    await expect(today.startLead).toHaveText(
      'Add the people who matter. Popkin remembers their birthdays, what you talked about and what you promised, then tells you when it’s time.',
    );
    await expect(today.addSomeone).toHaveAttribute('href', '/contacts/people/new');
  });
});
