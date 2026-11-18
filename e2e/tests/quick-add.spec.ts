// Acceptance Test
// Traces to: L2-177, L2-178
// Description: Quick Add asks for a name only, saves the contact with what was typed, and keeps everything when a save fails.
import { contactSent, contactsMorning } from '../fixtures/contacts';
import { expect, test } from '../fixtures/pk-test';
import { answer, hold, problem, recordedBody } from '../fixtures/stubs';
import { QuickAddPage } from '../pages/quick-add.page';
import { Toasts } from '../pages/toasts';

const femi = () => recordedBody<{ id: string }>('POST /api/contacts/people');

test.describe('Quick Add', () => {
  // L2-178 AC1, L2-177 AC2
  test('offers a name, Phone, Who are they? and a circle, with the name focused', async ({
    page,
    pk,
  }) => {
    await pk.open('quickAdd');

    const quick = new QuickAddPage(page);
    await expect(quick.heading).toHaveText('Add someone');
    await expect(quick.cancel).toBeVisible();
    await expect(quick.save).toBeVisible();
    await expect(quick.addPhoto).toBeVisible();
    await expect(quick.name).toHaveAttribute('placeholder', 'Their name');
    await expect(quick.name).toBeFocused();
    await expect(quick.phone).toHaveAttribute('type', 'tel');
    await expect(quick.phoneLabel).toContainText('Optional');
    await expect(quick.whoAreThey).toHaveAttribute('placeholder', 'Neighbour, Grace’s fiancé…');
    await expect(quick.circle.getByRole('radio')).toHaveText([
      'Family',
      'Friends',
      'Work',
      'Neighbours',
      'Clubs',
    ]);
    await expect(quick.circleChoice('Friends')).toHaveAttribute('aria-checked', 'true');
  });

  // L2-178 AC2
  test('Save is off with no name, or a name of spaces only', async ({ page, pk }) => {
    await pk.open('quickAdd');
    const quick = new QuickAddPage(page);

    await expect(quick.save).toBeDisabled();
    await quick.name.fill('   ');
    await expect(quick.save).toBeDisabled();
    await quick.name.fill('Femi');
    await expect(quick.save).toBeEnabled();
  });

  // L2-178 AC3, AC4
  test('Save keeps them with the name trimmed and opens Added', async ({ page, pk }) => {
    await pk.open('quickAdd');
    const quick = new QuickAddPage(page);
    await quick.name.fill('  Femi Bankole ');
    await quick.phone.fill('+44 7700 900631');
    await quick.whoAreThey.fill('Grace’s fiancé');
    await quick.circleChoice('Work').click();
    const request = page.waitForRequest(
      (r) => r.method() === 'POST' && r.url().endsWith('/api/contacts/people'),
    );

    await quick.save.click();

    expect(contactSent(await request)).toEqual({
      clientId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      name: 'Femi Bankole',
      knownAs: 'Grace’s fiancé',
      circle: 'Work',
      phone: '+44 7700 900631',
      email: '',
      city: '',
      howWeMet: '',
      loves: [],
    });
    await expect(page).toHaveURL(`/contacts/people/${femi().id}/added`);
  });

  // L2-178 AC3
  test('Enter in a field saves', async ({ page, pk }) => {
    await pk.open('quickAdd');
    const quick = new QuickAddPage(page);
    await quick.name.fill('Femi Bankole');
    await quick.whoAreThey.fill('Grace’s fiancé');

    await quick.whoAreThey.press('Enter');

    await expect(page).toHaveURL(`/contacts/people/${femi().id}/added`);
  });

  // L2-178 AC3
  test('while saving, Save reads Saving… and is disabled', async ({ page, pk }) => {
    const release = await hold(page, 'POST /api/contacts/people');
    await pk.open('quickAdd');
    const quick = new QuickAddPage(page);
    await quick.name.fill('Femi Bankole');

    await quick.save.click();

    await expect(quick.saving).toBeDisabled();
    release();
    await expect(page).toHaveURL(`/contacts/people/${femi().id}/added`);
  });

  // L2-178 AC5
  test('a failed save says so and keeps everything typed', async ({ page, pk }) => {
    await answer(page, 'POST /api/contacts/people', problem(500, 'unexpected'));
    await pk.open('quickAdd');
    const quick = new QuickAddPage(page);
    await quick.name.fill('Femi Bankole');
    await quick.phone.fill('+44 7700 900631');
    await quick.whoAreThey.fill('Grace’s fiancé');
    await quick.circleChoice('Work').click();

    await quick.save.click();

    await expect(quick.failed).toHaveText(
      'We couldn’t save Femi. Everything you typed is still here. Check your connection and try Save again.',
    );
    await expect(quick.name).toHaveValue('Femi Bankole');
    await expect(quick.phone).toHaveValue('+44 7700 900631');
    await expect(quick.whoAreThey).toHaveValue('Grace’s fiancé');
    await expect(quick.circleChoice('Work')).toHaveAttribute('aria-checked', 'true');
    await expect(quick.save).toBeEnabled();
    await expect(page).toHaveURL('/contacts/quick-add');
  });

  // L2-123 AC4; known gap 157
  test('offline, keeps the add on the device, says so and opens empty for the next person', async ({
    page,
    context,
    pk,
  }) => {
    await pk.open('quickAdd');
    const quick = new QuickAddPage(page);
    await quick.name.fill('Femi Bankole');
    await quick.circleChoice('Work').click();

    await context.setOffline(true);
    await quick.save.click();

    await expect(new Toasts(page).toast).toContainText('You’re offline');
    await expect(page).toHaveURL('/contacts/quick-add');
    await expect(quick.name).toHaveValue('');
    await expect(quick.name).toBeFocused();
    await expect(quick.circleChoice('Friends')).toHaveAttribute('aria-checked', 'true');

    const sent = page.waitForRequest(
      (r) => r.method() === 'POST' && r.url().endsWith('/api/contacts/people'),
    );
    await context.setOffline(false);
    expect(contactSent(await sent)).toMatchObject({ name: 'Femi Bankole', circle: 'Work' });
  });

  // L2-178 AC6
  test('Cancel saves nothing and opens Today', async ({ page, pk }) => {
    await page.clock.install({ time: contactsMorning });
    await pk.open('quickAdd');
    const quick = new QuickAddPage(page);
    const sent: string[] = [];
    page.on('request', (r) => {
      if (r.method() === 'POST') sent.push(r.url());
    });
    await quick.name.fill('Femi Bankole');

    await quick.cancel.click();

    await expect(page).toHaveURL('/contacts');
    expect(sent).toEqual([]);
  });
});
