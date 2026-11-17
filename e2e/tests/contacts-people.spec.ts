// Acceptance Test
// Traces to: L2-126, L2-127, L2-123
// Description: People lists every contact, Closest first, and is searched by name and narrowed to a circle.
import {
  contactsMorning,
  contactsOfMara,
  serveRecordedPhotos,
  marasPeople,
  nobodyInPeople,
  peopleKey,
  recordedContactId,
} from '../fixtures/contacts';
import { expect, test } from '../fixtures/pk-test';
import { failNetwork, hold } from '../fixtures/stubs';
import { ContactsPeoplePage } from '../pages/contacts-people.page';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: contactsMorning });
});

test.describe('People', () => {
  // L2-126 AC1, AC3; L2-127 AC1
  test('lists Mara’s 13 people A to Z, with the circles and their counts', async ({ page, pk }) => {
    await marasPeople(page);
    await pk.open('contactsPeople');

    const people = new ContactsPeoplePage(page);
    await expect(people.heading).toHaveText('People');
    await expect(people.sub).toHaveText('13 people · only you can see them');
    await expect(people.connections).toHaveAttribute('href', '/contacts/connections');
    await expect(people.addSomeone).toHaveAttribute('href', '/contacts/people/new');
    await expect(people.search).toHaveValue('');
    await expect(people.circles.getByRole('button')).toHaveText([
      /All\s*13/,
      /Family\s*4/,
      /Friends\s*2/,
      /Work\s*2/,
      /Neighbours\s*1/,
      /Clubs\s*4/,
    ]);
    await expect(people.circle('All')).toHaveAttribute('aria-pressed', 'true');
    await expect(people.list).toHaveAccessibleName('Everyone');
    await expect(people.rows.locator('.row__title')).toHaveText([
      'Ada Okafor',
      'Ben Hale',
      'Chidi Okafor',
      'Dev Patel',
      'Ellie Brennan',
      'Grace Adeyemi',
      'Ifeoma Okafor',
      'Joel Kim',
      'Priya Nair',
      'Ruth Lindqvist',
      'Sam Ortega',
      'Tomás Reyes',
      'Walt Brennan',
    ]);
    const ada = people.row('Ada Okafor');
    await expect(ada).toHaveAttribute(
      'href',
      '/contacts/people/00000000-0000-4000-d000-000000000001',
    );
    await expect(ada.locator('.row__text')).toHaveText('Mum');
    await expect(ada.locator('.contact-row__cell')).toHaveText(['Family', /Oct 7\s*·\s*Birthday/]);
    await expect(ada.locator('.contact-row__last')).toHaveText('Last talked Sun');
    await expect(people.row('Dev Patel').locator('.contact-row__last')).toHaveText(
      'Last talked Mon',
    );
    await expect(people.row('Ben Hale').locator('.contact-row__last')).toHaveText(
      'Last talked Sep 5',
    );
    await expect(people.row('Ellie Brennan').locator('.contact-row__cell').last()).toHaveText(
      'Birthday Apr 29',
    );
    const sam = people.row('Sam Ortega').locator('.contact-row__last');
    await expect(sam).toHaveText('Last talked 59 days ago');
    await expect(sam).toHaveClass(/contact-row__last--quiet/);
  });

  // L2-126 AC2
  test('shows Closest first, by first name, each opening the profile', async ({ page, pk }) => {
    await marasPeople(page);
    await pk.open('contactsPeople');

    const people = new ContactsPeoplePage(page);
    await expect(people.closestPeople).toHaveText(['Ada', 'Chidi', 'Grace']);
    await expect(people.closestPeople.filter({ hasText: 'Chidi' })).toHaveAttribute(
      'href',
      '/contacts/people/00000000-0000-4000-d000-000000000003',
    );
  });

  // L2-126 AC1
  test('on a phone, offers Add someone and not Connections', async ({ page, pk }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await marasPeople(page);
    await pk.open('contactsPeople');

    const people = new ContactsPeoplePage(page);
    await expect(people.addSomeone).toBeVisible();
    await expect(people.connections).toBeHidden();
  });

  // L2-126 AC3, as recorded: Chidi and Femi, both in Closest, nothing logged yet
  test('reads the people the API keeps', async ({ page, pk }) => {
    await serveRecordedPhotos(page);
    await pk.open('contactsPeople');

    const people = new ContactsPeoplePage(page);
    await expect(people.rows.locator('.row__title')).toHaveText(['Chidi Okafor', 'Femi Bankole']);
    await expect(people.row('Femi Bankole')).toHaveAttribute(
      'href',
      `/contacts/people/${recordedContactId('Femi Bankole')}`,
    );
    await expect(people.row('Femi Bankole').locator('.contact-row__last')).toHaveText(
      'Last talked Not yet',
    );
  });

  // L2-126 AC4
  test('with nobody in Contacts, says so and offers to add someone', async ({ page, pk }) => {
    await nobodyInPeople(page);
    await pk.open('contactsPeopleEmpty');

    const people = new ContactsPeoplePage(page);
    await expect(people.sub).toHaveText('Only you can see them');
    await expect(people.stateHeading).toHaveText('No one here yet');
    await expect(people.stateText).toHaveText(
      'Add the people who matter, or bring in the people you already know from your Popkins.',
    );
    await expect(people.stateAction('Add someone')).toHaveAttribute('href', '/contacts/people/new');
    await expect(people.search).toHaveCount(0);
    await expect(people.circles).toHaveCount(0);
    await expect(people.connections).toHaveCount(0);
  });

  // L2-123 AC1; L2-127 AC4
  test('while it loads, says so and keeps the search', async ({ page, pk }) => {
    await marasPeople(page);
    await hold(page, peopleKey);
    await pk.open('contactsPeopleLoading');

    const people = new ContactsPeoplePage(page);
    await expect(people.loading).toBeAttached();
    await expect(people.sub).toHaveText('13 people · only you can see them');
    await expect(people.search).toBeVisible();
    await expect(people.circles).toHaveCount(0);
  });

  // L2-123 AC2, AC3
  test('when it cannot load, says nobody is lost and tries again', async ({ page, pk }) => {
    await contactsOfMara(page);
    await failNetwork(page, peopleKey);
    await pk.open('contactsPeopleError');

    const people = new ContactsPeoplePage(page);
    await expect(people.state).toHaveRole('alert');
    await expect(people.stateHeading).toHaveText('We couldn’t load your people');
    await expect(people.stateText).toHaveText(
      'Nobody you added is lost. Check your connection and try again.',
    );
    await expect(people.search).toHaveCount(0);

    await marasPeople(page);
    await people.tryAgain.click();

    await expect(people.rows).toHaveCount(13);
  });
});

test.describe('Find people', () => {
  // L2-127 AC2
  test('a circle shows only its people, in a list named after it, without Closest', async ({
    page,
    pk,
  }) => {
    await marasPeople(page);
    await pk.open('contactsPeopleFamily');

    const people = new ContactsPeoplePage(page);
    await people.circle('Family').click();

    await expect(people.circle('Family')).toHaveAttribute('aria-pressed', 'true');
    await expect(people.circle('All')).toHaveAttribute('aria-pressed', 'false');
    await expect(people.list).toHaveAccessibleName('Family');
    await expect(people.rows.locator('.row__title')).toHaveText([
      'Ada Okafor',
      'Chidi Okafor',
      'Ifeoma Okafor',
      'Tomás Reyes',
    ]);
    await expect(people.closest).toHaveCount(0);
  });

  // L2-127 AC3; known gap 101
  test('the search finds any part of a name, ignoring case and accents, within the circle', async ({
    page,
    pk,
  }) => {
    await marasPeople(page);
    await pk.open('contactsPeople');

    const people = new ContactsPeoplePage(page);
    await people.search.fill('tomas');
    await expect(people.rows.locator('.row__title')).toHaveText(['Tomás Reyes']);
    await expect(people.closest).toHaveCount(0);

    await people.search.fill('okafor');
    await people.circle('Family').click();
    await expect(people.rows.locator('.row__title')).toHaveText([
      'Ada Okafor',
      'Chidi Okafor',
      'Ifeoma Okafor',
    ]);
  });

  // L2-127 AC3
  test('a name that matches nobody offers to add them, with the name filled in', async ({
    page,
    pk,
  }) => {
    await marasPeople(page);
    await pk.open('contactsPeopleNoResults');

    const people = new ContactsPeoplePage(page);
    await people.search.fill('Femi');

    await expect(people.state).toHaveRole('status');
    await expect(people.stateHeading).toHaveText('No one called “Femi”');
    await expect(people.stateText).toHaveText('Check the spelling, or add them as someone new.');
    await expect(people.closest).toHaveCount(0);
    await expect(people.list).toHaveCount(0);
    await expect(people.circles).toBeVisible();

    await people.stateAction('Add “Femi”').click();

    await expect(page).toHaveURL('/contacts/people/new?name=Femi');
    await expect(page.getByRole('textbox', { name: 'Name' })).toHaveValue('Femi');
  });
});
