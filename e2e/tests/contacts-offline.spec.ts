// Acceptance Test
// Traces to: L2-123 AC4, L2-124 AC3
// Description: Someone added offline is kept on the device and saved when the connection returns.
import {
  contactSent,
  contactsMorning,
  peopleKey,
  serveRecordedPhotos,
} from '../fixtures/contacts';
import { expect, test } from '../fixtures/pk-test';
import { ContactFormPage } from '../pages/contact-form.page';
import { ContactsPeoplePage } from '../pages/contacts-people.page';
import { Toasts } from '../pages/toasts';

test.describe('Contacts offline', () => {
  // L2-123 AC4; known gap 118
  test('keeps someone added offline, says so, and saves them once back', async ({
    page,
    context,
    pk,
  }) => {
    await page.clock.install({ time: contactsMorning });
    await serveRecordedPhotos(page);
    // Add someone, reached from People, so both screens are on the device.
    await pk.open('contactsPeople');
    const people = new ContactsPeoplePage(page);
    await expect(people.rows).toHaveCount(2);
    await people.addSomeone.click();
    const form = new ContactFormPage(page);
    await form.name.fill('Femi Bankole');

    await context.setOffline(true);
    await form.save.click();

    const toasts = new Toasts(page);
    await expect(toasts.toast).toContainText('You’re offline');
    await expect(toasts.toast).toContainText(
      'What you add is kept on this phone and saved when you’re back.',
    );
    await expect(page).toHaveURL('/contacts/people');

    const sent = page.waitForRequest(
      (r) => r.method() === 'POST' && r.url().endsWith('/api/contacts/people'),
    );
    const readAgain = page.waitForRequest((r) => r.url().endsWith(peopleKey.slice(4)));
    await context.setOffline(false);

    expect(contactSent(await sent)).toMatchObject({ name: 'Femi Bankole' });
    await readAgain;
    await expect(people.rows.locator('.row__title')).toHaveText([
      'Chidi Okafor',
      'Femi Bankole',
    ]);
  });
});
