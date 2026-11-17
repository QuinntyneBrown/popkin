// Acceptance Test
// Traces to: L2-129 AC2, L2-130, L2-138
// Description: Add someone's "Dates to remember" holds dates chosen in Add a date and saves them with the contact.
import { contactSent, contactsMorning, femiProfile, recordedContactId } from '../fixtures/contacts';
import { expect, test } from '../fixtures/pk-test';
import { AddDateDialog } from '../pages/add-date.dialog';
import { ContactFormPage } from '../pages/contact-form.page';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: contactsMorning });
});

test.describe('Dates to remember', () => {
  // L2-129 AC2
  test('Another date adds a birthday, with its reminder, saved with the contact', async ({
    page,
    pk,
  }) => {
    await pk.open('addContact');
    const form = new ContactFormPage(page);
    await form.name.fill('Femi Bankole');
    await expect(form.dates.locator('.form-section__hint')).toHaveText(
      'We’ll nudge you ahead of each one.',
    );

    await form.anotherDate.click();
    const dialog = new AddDateDialog(page);
    await expect(dialog.forWho).toHaveCount(0);
    await dialog.day.fill('1990-03-09');
    await dialog.save.click();

    await expect(dialog.root).toBeHidden();
    await expect(form.dateEntries).toHaveCount(1);
    await expect(form.dateEntries.first()).toContainText('Birthday');
    await expect(form.dateEntries.first()).toContainText('9 March');
    await expect(form.remindAbout('birthday')).toHaveValue('TwoWeeksBefore');
    await form.remindAbout('birthday').selectOption('OnTheDay');
    const request = page.waitForRequest(
      (r) => r.method() === 'POST' && r.url().endsWith('/api/contacts/people'),
    );

    await form.save.click();

    expect(contactSent(await request)).toMatchObject({
      name: 'Femi Bankole',
      keyDates: [
        {
          kind: 'Birthday',
          title: null,
          month: 3,
          day: 9,
          year: 1990,
          everyYear: true,
          reminder: 'OnTheDay',
        },
      ],
    });
  });

  // L2-129 AC2
  test('Remove the wedding takes it off the list', async ({ page, pk }) => {
    await pk.open('addContact');
    const form = new ContactFormPage(page);
    await form.anotherDate.click();
    const dialog = new AddDateDialog(page);
    await dialog.kind('Something else').click();
    await dialog.title.fill('Wedding');
    await dialog.everyYear.click();
    await dialog.day.fill('2026-12-26');
    await dialog.save.click();
    await expect(form.dateEntries.first()).toContainText('26 December 2026');

    await form.removeDate('wedding').click();

    await expect(form.dateEntries).toHaveCount(0);
  });

  // L2-130 AC1, AC3
  test('Edit starts from the dates kept, and sends them back with their ids', async ({
    page,
    pk,
  }) => {
    await femiProfile(page, {
      keyDates: [
        {
          id: '00000000-0000-4000-e000-000000000201',
          kind: 'Birthday',
          title: null,
          month: 3,
          day: 9,
          year: null,
          everyYear: true,
          reminder: 'OneWeekBefore',
          nextOn: '2027-03-09',
          daysLeft: 175,
        },
      ],
    });
    await pk.open('editContact');
    const form = new ContactFormPage(page);
    await expect(form.dateEntries).toHaveCount(1);
    await expect(form.remindAbout('birthday')).toHaveValue('OneWeekBefore');
    const request = page.waitForRequest(
      (r) =>
        r.method() === 'PUT' &&
        r.url().endsWith(`/api/contacts/people/${recordedContactId('Femi Bankole')}`),
    );

    await form.save.click();

    expect(contactSent(await request)).toMatchObject({
      keyDates: [{ id: '00000000-0000-4000-e000-000000000201', reminder: 'OneWeekBefore' }],
    });
  });
});
