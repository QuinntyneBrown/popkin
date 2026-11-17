// Acceptance Test
// Traces to: L2-128, L2-131, L2-123, L2-121
// Description: A contact's profile shows who they are and how to reach them, and its menu puts them in Closest or takes them out.
import { chidiProfile, contactPhoto, femiProfile, recordedContactId } from '../fixtures/contacts';
import { expect, test } from '../fixtures/pk-test';
import { failNetwork, hold } from '../fixtures/stubs';
import { ContactActionsDialog } from '../pages/contact-actions.dialog';
import { ContactProfilePage } from '../pages/contact-profile.page';
import { ContactsNav } from '../pages/contacts-nav';

const chidi = () => recordedContactId('Chidi Okafor');
const femi = () => recordedContactId('Femi Bankole');

test.describe('A contact’s profile', () => {
  // L2-128 AC1, AC3, AC6, AC8; L2-122 AC4 (first name, never a pronoun)
  test('shows Chidi: who he is, how to reach him, about him and his history', async ({
    page,
    pk,
  }) => {
    await chidiProfile(page);
    await pk.open('contactProfile');

    const profile = new ContactProfilePage(page);
    await expect(profile.root).toBeVisible();
    await expect(profile.back).toHaveAttribute('href', '/contacts/people');
    await expect(profile.edit).toHaveAttribute('href', `/contacts/people/${chidi()}/edit`);
    await expect(profile.more).toHaveAccessibleName('More for Chidi');
    await expect(profile.name).toHaveText('Chidi Okafor');
    await expect(profile.sub).toHaveText('Brother · Family · Manchester');
    await expect(profile.photo).toHaveAttribute('src', contactPhoto);
    await expect(profile.message).toHaveAttribute('href', 'sms:+44 7700 900788');
    await expect(profile.call).toHaveAttribute('href', 'tel:+44 7700 900788');
    await expect(profile.email).toHaveCount(0);
    await expect(profile.log).toHaveAttribute('href', `/contacts/people/${chidi()}/log`);
    await expect(profile.about.getByRole('heading')).toHaveText(['About Chidi', 'Loves']);
    await expect(profile.facts.locator('dd')).toHaveText([
      '+44 7700 900788',
      'chidi@okafor.dev',
      'Manchester',
      'Little brother, 3 years younger',
    ]);
    await expect(profile.loves).toHaveText([
      'Man City',
      'Vinyl — Fela, Sade',
      'Long bike rides',
      'Hot sauce collecting',
    ]);
    await expect(profile.habitTitle).toHaveText('Lunch with Chidi');
    await expect(profile.historyTabs).toHaveText(['Timeline', 'Follow-ups 1', 'Memories & files']);
    await expect(profile.timelineEntries).toHaveCount(3);
  });

  // L2-128 AC3
  test('offers Email in place of Message and Call when there is an email and no phone', async ({
    page,
    pk,
  }) => {
    await femiProfile(page);
    await pk.open('contactProfileEmpty');

    const profile = new ContactProfilePage(page);
    await expect(profile.name).toHaveText('Femi Bankole');
    await expect(profile.email).toHaveAttribute('href', 'mailto:femi.b@mail.com');
    await expect(profile.message).toHaveCount(0);
    await expect(profile.call).toHaveCount(0);
  });

  // L2-128 AC1, L2-151 AC3: an imported contact is kept with their name alone.
  test('leaves About out for someone known by name alone', async ({ page, pk }) => {
    await femiProfile(page, { phone: null, email: null, city: null, howWeMet: null, loves: [] });
    await pk.open('contactProfileEmpty');

    const profile = new ContactProfilePage(page);
    await expect(profile.name).toHaveText('Femi Bankole');
    await expect(profile.about).toHaveCount(0);
  });

  // L2-121 AC6
  test('on a phone, shows only its People back link and no Contacts tabs', async ({ page, pk }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await chidiProfile(page);
    await pk.open('contactProfile');

    const profile = new ContactProfilePage(page);
    await expect(profile.name).toBeVisible();
    await expect(profile.back).toBeVisible();
    await expect(new ContactsNav(page).root).toBeHidden();
  });

  // L2-123 AC1; known gap 111
  test('while it loads, says so without a name it does not know yet', async ({ page, pk }) => {
    await hold(page, `GET /api/contacts/people/${chidi()}`);
    await pk.open('contactProfileLoading');

    await expect(new ContactProfilePage(page).loading).toHaveText('Loading the profile…');
  });

  // L2-123 AC2, AC3
  test('when it cannot load, says the notes are safe and tries again', async ({ page, pk }) => {
    await failNetwork(page, `GET /api/contacts/people/${chidi()}`);
    await pk.open('contactProfileError');

    const profile = new ContactProfilePage(page);
    await expect(profile.stateHeading).toHaveText('We couldn’t load this profile');
    await expect(profile.stateText).toHaveText(
      'The timeline and notes are safe. Check your connection and try again.',
    );

    await chidiProfile(page);
    await profile.tryAgain.click();

    await expect(profile.name).toHaveText('Chidi Okafor');
  });
});

test.describe('More for a contact', () => {
  // L2-131 AC1, AC2
  test('offers Closest, Edit, connections and Delete, and takes Chidi out of Closest', async ({
    page,
    pk,
  }) => {
    await chidiProfile(page);
    await pk.open('contactActions');
    const profile = new ContactProfilePage(page);
    const sent = page.waitForRequest(
      (r) => r.method() === 'DELETE' && r.url().endsWith(`/api/contacts/people/${chidi()}/closest`),
    );

    await profile.more.click();
    const menu = new ContactActionsDialog(page);
    await expect(menu.heading).toHaveText('Chidi Okafor');
    await expect(menu.items).toHaveText([
      /^\s*Take Chidi out of Closest\s*Chidi stays in People and Family\.\s*$/,
      /^\s*Edit profile\s*$/,
      /^\s*See Chidi’s connections\s*$/,
      /^\s*Delete Chidi\s*$/,
    ]);
    await menu.item('Take Chidi out of Closest').click();

    await sent;
    await expect(menu.root).toBeHidden();
  });

  // L2-131 AC4
  test('puts Femi, who is not in Closest, there', async ({ page, pk }) => {
    await pk.open('contactActionsNotClosest');
    const profile = new ContactProfilePage(page);
    const sent = page.waitForRequest(
      (r) => r.method() === 'PUT' && r.url().endsWith(`/api/contacts/people/${femi()}/closest`),
    );

    await profile.more.click();
    const menu = new ContactActionsDialog(page);
    await expect(menu.item('Add Femi to Closest')).toContainText('Femi shows first in People.');
    await menu.item('Add Femi to Closest').click();

    await sent;
    await expect(menu.root).toBeHidden();
  });

  // L2-131 AC1
  test('Edit profile opens the form', async ({ page, pk }) => {
    await chidiProfile(page);
    await pk.open('contactActions');

    await new ContactProfilePage(page).more.click();
    await new ContactActionsDialog(page).item('Edit profile').click();

    await expect(page).toHaveURL(`/contacts/people/${chidi()}/edit`);
  });
});
