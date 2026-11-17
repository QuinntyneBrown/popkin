// Acceptance Test
// Traces to: L2-149, L2-150, known gap 109 (ruled)
// Description: Connections draws how my contacts know each other, focuses a face and filters the lines, and Connect makes a connection.
import {
  connectionsAsDrawn,
  connectionsKey,
  faceId,
  marasConnections,
  noConnections,
  peopleOfTheMap,
} from '../fixtures/connections';
import {
  chidiProfile,
  contactSent,
  contactsMorning,
  peopleKey,
  servePhotos,
} from '../fixtures/contacts';
import { expect, test } from '../fixtures/pk-test';
import { answer, failNetwork, hold } from '../fixtures/stubs';
import { ConnectPersonDialog } from '../pages/connect-person.dialog';
import { ContactFormPage } from '../pages/contact-form.page';
import { ContactProfilePage } from '../pages/contact-profile.page';
import { ContactsConnectionsPage } from '../pages/contacts-connections.page';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: contactsMorning });
  await answer(page, peopleKey, { status: 200, body: peopleOfTheMap() });
  await servePhotos(page);
});

test.describe('Connections', () => {
  // L2-149 AC1, AC2, AC6
  test('draws You in the middle, a face for each connected contact, and the lines', async ({
    page,
    pk,
  }) => {
    await marasConnections(page);
    await pk.open('contactsConnections');
    const connections = new ContactsConnectionsPage(page);

    await expect(connections.heading).toHaveText('Connections');
    await expect(connections.sub).toHaveText(
      'Who’s family, who’s friends, and how everyone knows each other',
    );
    await expect(connections.faces).toHaveCount(12);
    await expect(connections.face('Chidi Okafor')).toHaveAttribute('aria-pressed', 'false');
    await expect(connections.lines).toHaveCount(17);
    await expect(connections.map.locator('.connection-map__line--pending')).toHaveCount(1);
    await expect(connections.panelHeading).toHaveText('Tap anyone to see their people');
    await expect(connections.panel).toContainText(
      'Lines show how people know each other: coral for family, green for friends, a dashed grey line for work. Dotted means an introduction you’ve promised.',
    );
    await expect(connections.filter('Everyone')).toHaveAttribute('aria-pressed', 'true');
  });

  // L2-149 AC3, AC7
  test('choosing a face brings its lines forward and lists its people', async ({ page, pk }) => {
    await marasConnections(page);
    await pk.open('contactsConnectionsChidi');
    const connections = new ContactsConnectionsPage(page);

    await connections.face('Chidi Okafor').click();

    await expect(connections.face('Chidi Okafor')).toHaveAttribute('aria-pressed', 'true');
    await expect(connections.map.locator('.connection-map__line--on')).toHaveCount(2);
    await expect(connections.face('Grace Adeyemi')).toHaveClass(/connection-map__node--dim/);
    await expect(connections.panelHeading).toHaveText('Chidi Okafor');
    await expect(connections.panel).toContainText('Brother');
    await expect(connections.panelRows).toHaveText([/You\s*Brother/, /Tomás Reyes\s*Married/]);
    await expect(connections.row('Tomás Reyes').getByRole('link')).toHaveAttribute(
      'href',
      `/contacts/people/${faceId('Tomás Reyes')}`,
    );
    await expect(connections.openProfile).toHaveAttribute(
      'href',
      `/contacts/people/${faceId('Chidi Okafor')}`,
    );
  });

  // L2-149 AC3
  test('choosing the face again, or Clear the focus, shows everyone', async ({ page, pk }) => {
    await marasConnections(page);
    await pk.open('contactsConnectionsChidi');
    const connections = new ContactsConnectionsPage(page);
    await connections.face('Chidi Okafor').click();

    await connections.face('Chidi Okafor').click();

    await expect(connections.face('Chidi Okafor')).toHaveAttribute('aria-pressed', 'false');
    await expect(connections.map.locator('.connection-map__line--dim')).toHaveCount(0);

    await connections.face('Chidi Okafor').click();
    await connections.clearFocus.click();

    await expect(connections.panelHeading).toHaveText('Tap anyone to see their people');
  });

  // L2-149 AC8
  test('opens with a contact chosen from their profile', async ({ page, pk }) => {
    await marasConnections(page);
    await pk.open('contactsConnections');
    await page.goto(`/contacts/connections?contact=${faceId('Chidi Okafor')}`);
    const connections = new ContactsConnectionsPage(page);

    await expect(connections.panelHeading).toHaveText('Chidi Okafor');
  });

  // L2-149 AC4
  test('Family shows only family and partner lines', async ({ page, pk }) => {
    await marasConnections(page);
    await pk.open('contactsConnectionsFamily');
    const connections = new ContactsConnectionsPage(page);

    await connections.filter('Family').click();

    await expect(connections.filter('Family')).toHaveAttribute('aria-pressed', 'true');
    await expect(connections.lines).toHaveCount(6);
    await expect(connections.faces).toHaveCount(12);
  });

  // L2-149 AC5
  test('with no connections, says the map starts with you', async ({ page, pk }) => {
    await noConnections(page);
    await pk.open('contactsConnectionsEmpty');
    const connections = new ContactsConnectionsPage(page);

    await expect(connections.stateHeading).toHaveText('Your map starts with you');
    await expect(connections.stateText).toHaveText(
      'Connect two people — a couple, a parent and child, old friends — and they appear here, joined by a line.',
    );
    await expect(connections.stateAction).toHaveText('Connect two people');
  });

  test('a failed read says the map is safe and offers Try again', async ({ page, pk }) => {
    await failNetwork(page, connectionsKey);
    await pk.open('contactsConnectionsError');
    const connections = new ContactsConnectionsPage(page);

    await expect(connections.stateHeading).toHaveText('We couldn’t load your connections');
    await expect(connections.stateText).toHaveText(
      'Your map is safe. Check your connection and try again.',
    );
    await expect(connections.tryAgain).toBeVisible();
  });
});

test.describe('Connect', () => {
  async function openForChidi(
    page: import('@playwright/test').Page,
    pk: { open: (key: 'connectPerson') => Promise<void> },
  ) {
    await marasConnections(page);
    await pk.open('connectPerson');
    const connections = new ContactsConnectionsPage(page);
    await connections.face('Chidi Okafor').click();
    await connections.connect.click();
    return new ConnectPersonDialog(page);
  }

  // L2-150 AC1, AC5
  test('lists everyone but Chidi and those already connected to him', async ({ page, pk }) => {
    const dialog = await openForChidi(page, pk);

    await expect(dialog.heading).toHaveText('Connect Chidi to…');
    await expect(dialog.people).toHaveCount(10);
    await expect(dialog.person('Tomás Reyes')).toHaveCount(0);
    await expect(dialog.kind('Family')).toHaveAttribute('aria-checked', 'true');
    await expect(dialog.words).toHaveAttribute('placeholder', 'Mum, old friends, worked together…');
    await expect(dialog.promised).toHaveAttribute('aria-checked', 'false');
  });

  // L2-150 AC2
  test('with nobody chosen, nothing is sent and Who says so', async ({ page, pk }) => {
    const dialog = await openForChidi(page, pk);

    await dialog.submit.click();

    await expect(dialog.summary.getByRole('link')).toHaveText([
      'Who: pick who Chidi is connected to.',
    ]);
    await expect(dialog.whoError).toHaveText('Pick who Chidi is connected to.');
  });

  // L2-150 AC3, AC8
  test('a search that matches nobody offers to add them', async ({ page, pk }) => {
    const dialog = await openForChidi(page, pk);

    await dialog.search.fill('Femi');

    await expect(dialog.noResults).toContainText('No one called “Femi” in your contacts');
    await expect(dialog.noResults).toContainText('Add them first, then connect them to Chidi.');
    await expect(dialog.add).toHaveText('Add “Femi”');
    await expect(dialog.add).toHaveAttribute('href', '/contacts/people/new?name=Femi');
  });

  // L2-150 AC4, AC6
  test('connects them, dotted while not introduced, and the map draws the line', async ({
    page,
    pk,
  }) => {
    const dialog = await openForChidi(page, pk);
    const drawn = connectionsAsDrawn();
    const made = {
      id: '00000000-0000-4000-d100-000000000099',
      contactId: faceId('Ada Okafor'),
      otherContactId: faceId('Chidi Okafor'),
      kind: 'Family',
      words: 'Sister',
      promised: true,
    };
    await answer(page, 'POST /api/contacts/connections', { status: 201, body: made });
    await answer(page, connectionsKey, {
      status: 200,
      body: { ...drawn, connections: [...drawn.connections, made] },
    });
    await dialog.person('Ada Okafor').click();
    await dialog.words.fill('Sister');
    await dialog.promised.click();
    const sent = page.waitForRequest(
      (r) => r.method() === 'POST' && r.url().endsWith('/connections'),
    );

    await dialog.submit.click();

    expect((await sent).postDataJSON()).toMatchObject({
      contactId: faceId('Chidi Okafor'),
      otherContactId: faceId('Ada Okafor'),
      kind: 'Family',
      words: 'Sister',
      promised: true,
    });
    const connections = new ContactsConnectionsPage(page);
    await expect(dialog.root).toHaveCount(0);
    await expect(connections.row('Ada Okafor')).toContainText('Sister');
  });

  test('while connecting, the button reads Connecting… and is disabled', async ({ page, pk }) => {
    const dialog = await openForChidi(page, pk);
    await hold(page, 'POST /api/contacts/connections');
    await dialog.person('Ada Okafor').click();

    await dialog.submit.click();

    await expect(dialog.submit).toHaveText('Connecting…');
    await expect(dialog.submit).toBeDisabled();
  });

  // L2-150 AC7
  test('from the empty map asks who to connect first', async ({ page, pk }) => {
    await noConnections(page);
    await pk.open('connectPersonChoose');
    await new ContactsConnectionsPage(page).stateAction.click();
    const dialog = new ConnectPersonDialog(page);
    await expect(dialog.heading).toHaveText('Connect two people');

    await dialog.submit.click();

    await expect(dialog.summary.getByRole('link')).toHaveText([
      'Connect: choose the first person.',
      'Who: pick who they’re connected to.',
    ]);
  });
});

test.describe('Connections on a profile and in the form', () => {
  // L2-150 AC4
  test('a profile lists the people around them with the words', async ({ page, pk }) => {
    await chidiProfile(page, {
      around: [
        {
          id: '00000000-0000-4000-d100-000000000002',
          contactId: faceId('Tomás Reyes'),
          name: 'Tomás Reyes',
          initials: 'TR',
          accent: 'Leaf',
          photoUrl: null,
          kind: 'Partner',
          words: 'Married',
          promised: false,
        },
      ],
    });
    await pk.open('contactProfile');
    const profile = new ContactProfilePage(page);

    await expect(profile.around.getByRole('heading')).toHaveText('People around Chidi');
    await expect(profile.around.getByRole('link')).toHaveText(/Tomás Reyes\s*Married/);
    await expect(profile.around.getByRole('link')).toHaveAttribute(
      'href',
      `/contacts/people/${faceId('Tomás Reyes')}`,
    );
  });

  // L2-150 AC9
  test('Add someone connects them with the contact, sent on Save', async ({ page, pk }) => {
    await marasConnections(page);
    await pk.open('addContact');
    const form = new ContactFormPage(page);
    await form.name.fill('Femi Bankole');
    await form.connectTo.click();
    const dialog = new ConnectPersonDialog(page);
    await expect(dialog.heading).toHaveText('Connect Femi to…');
    await dialog.person('Grace Adeyemi').click();
    await dialog.kind('Partner').click();
    await dialog.submit.click();
    await expect(form.connections).toHaveText([/Grace Adeyemi\s*Partner/]);
    const request = page.waitForRequest(
      (r) => r.method() === 'POST' && r.url().endsWith('/api/contacts/people'),
    );

    await form.save.click();

    expect(contactSent(await request)).toMatchObject({
      connect: [
        { otherContactId: faceId('Grace Adeyemi'), kind: 'Partner', words: null, promised: false },
      ],
      disconnect: [],
    });
  });

  // L2-150 AC9
  test('Remove the connection takes it off before Save', async ({ page, pk }) => {
    await marasConnections(page);
    await pk.open('addContact');
    const form = new ContactFormPage(page);
    await form.name.fill('Femi Bankole');
    await form.connectTo.click();
    const dialog = new ConnectPersonDialog(page);
    await dialog.person('Grace Adeyemi').click();
    await dialog.submit.click();

    await form.connections.getByRole('button', { name: 'Remove the connection to Grace' }).click();

    await expect(form.connections).toHaveCount(0);
  });
});
