// Acceptance Test
// Traces to: L2-129, L2-123
// Description: Add someone keeps who they are and their details, asks for a name, and opens the new contact.
import { contactSent } from '../fixtures/contacts';
import { expect, test } from '../fixtures/pk-test';
import { answer, hold, problem, recordedBody } from '../fixtures/stubs';
import { ContactFormPage } from '../pages/contact-form.page';

const femi = () => recordedBody<{ id: string }>('POST /api/contacts/people');

test.describe('Add someone', () => {
  // L2-129 AC1
  test('offers Cancel, Save, who they are and their details', async ({ page, pk }) => {
    await pk.open('addContact');

    const form = new ContactFormPage(page);
    await expect(form.heading).toHaveText('Add someone');
    await expect(form.cancel).toBeVisible();
    await expect(form.save).toBeEnabled();
    await expect(form.addPhoto).toBeVisible();
    await expect(form.name).toHaveAttribute('placeholder', 'Their name');
    await expect(form.knownAs).toHaveAttribute('placeholder', 'Sister, neighbour, old boss…');
    await expect(form.circle.getByRole('radio')).toHaveText([
      'Family',
      'Friends',
      'Work',
      'Neighbours',
      'Clubs',
    ]);
    await expect(form.detailsHint).toHaveText('Optional.');
    await expect(form.phone).toHaveAttribute('type', 'tel');
    await expect(form.email).toHaveAttribute('type', 'email');
    await expect(form.city).toBeVisible();
    await expect(form.loves).toHaveAttribute('placeholder', 'Jazz, cycling, Arsenal…');
  });

  // L2-129 AC4
  test('with no name, saves nothing and says what to fix', async ({ page, pk }) => {
    await pk.open('addContact');
    const form = new ContactFormPage(page);
    const sent: string[] = [];
    page.on('request', (r) => r.method() === 'POST' && sent.push(r.url()));

    await form.save.click();

    await expect(form.summaryHeading).toHaveText('One thing to fix');
    await expect(form.summaryLinks).toHaveText(['Name: add a name so you can find them later.']);
    await expect(form.summary).toBeFocused();
    await expect(form.name).toHaveAttribute('aria-invalid', 'true');
    await expect(form.nameError).toHaveText('Add a name so you can find them later.');
    expect(sent).toEqual([]);
  });

  // L2-129 AC5
  test('with a name, saves them and opens their profile', async ({ page, pk }) => {
    await pk.open('addContact');
    const form = new ContactFormPage(page);
    await form.name.fill('Femi Bankole');
    await form.knownAs.fill('Grace’s fiancé');
    await form.circleChoice('Friends').click();
    await form.email.fill('femi.b@mail.com');
    await form.city.fill('London');
    await form.loves.fill('Arsenal, jazz brunches');
    const request = page.waitForRequest(
      (r) => r.method() === 'POST' && r.url().endsWith('/api/contacts/people'),
    );

    await form.save.click();

    expect(contactSent(await request)).toEqual({
      clientId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      name: 'Femi Bankole',
      knownAs: 'Grace’s fiancé',
      circle: 'Friends',
      phone: '',
      email: 'femi.b@mail.com',
      city: 'London',
      loves: ['Arsenal', 'jazz brunches'],
    });
    await expect(page).toHaveURL(`/contacts/people/${femi().id}`);
  });

  // L2-129 AC7
  test('Cancel saves nothing and opens People', async ({ page, pk }) => {
    await pk.open('addContact');
    const form = new ContactFormPage(page);
    await form.name.fill('Femi Bankole');

    await form.cancel.click();

    await expect(page).toHaveURL('/contacts/people');
  });

  // L2-123 AC5
  test('while saving, Save reads Saving… and is disabled', async ({ page, pk }) => {
    const release = await hold(page, 'POST /api/contacts/people');
    await pk.open('addContact');
    const form = new ContactFormPage(page);
    await form.name.fill('Femi Bankole');

    await form.save.click();

    await expect(form.saving).toBeDisabled();
    release();
    await expect(page).toHaveURL(`/contacts/people/${femi().id}`);
  });

  // L2-129 AC6
  test('a failed save says so and keeps everything typed', async ({ page, pk }) => {
    await answer(page, 'POST /api/contacts/people', problem(500, 'unexpected'));
    await pk.open('addContact');
    const form = new ContactFormPage(page);
    await form.name.fill('Femi Bankole');
    await form.knownAs.fill('Grace’s fiancé');
    await form.circleChoice('Friends').click();
    await form.loves.fill('Arsenal, jazz brunches');

    await form.save.click();

    await expect(form.failed).toHaveText(
      'We couldn’t save Femi. Everything you typed is still here. Check your connection and try Save again.',
    );
    await expect(form.failed).toHaveAttribute('role', 'alert');
    await expect(form.name).toHaveValue('Femi Bankole');
    await expect(form.knownAs).toHaveValue('Grace’s fiancé');
    await expect(form.circleChoice('Friends')).toHaveAttribute('aria-checked', 'true');
    await expect(form.loves).toHaveValue('Arsenal, jazz brunches');
    await expect(form.save).toBeEnabled();
    await expect(page).toHaveURL('/contacts/people/new');
  });
});
