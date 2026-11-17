import responses from '../fixtures/api/responses.json';
import { chidiProfile, contactSent, contactsMorning, peopleKey } from '../fixtures/contacts';
import {
  bookClub,
  groupOf,
  groupsAsDrawn,
  groupsKey,
  marasGroups,
  memberId,
  noGroups,
  peopleOfTheGroups,
} from '../fixtures/groups';
import { expect, test } from '../fixtures/pk-test';
import { answer, failNetwork, hold } from '../fixtures/stubs';
import { ContactFormPage } from '../pages/contact-form.page';
import { ContactProfilePage } from '../pages/contact-profile.page';
import { ContactsGroupsPage } from '../pages/contacts-groups.page';
import { GroupAddPeopleDialog } from '../pages/group-add-people.dialog';
import { HowLongPage } from '../pages/how-long.page';
import { NameYourPopkinPage } from '../pages/name-your-popkin.page';
import { NewGroupDialog } from '../pages/new-group.dialog';

const created = responses['POST /api/popkins'].body;

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: contactsMorning });
});

test.describe('Groups', () => {
  // L2-146 AC1, AC6
  test('lists the groups under their kinds, each with its members', async ({ page, pk }) => {
    await marasGroups(page);
    await pk.open('contactsGroups');
    const groups = new ContactsGroupsPage(page);

    await expect(groups.heading).toHaveText('Groups');
    await expect(groups.sub).toHaveText('Households, teams, small groups and clubs');
    await expect(groups.kinds).toHaveText(['Households', 'Small groups', 'Teams']);
    await expect(groups.items).toHaveText([
      /Mum’s house\s*Ada, Ifeoma/,
      /Chidi & Tomás\s*Chidi, Tomás/,
      /Thursday Night Group\s*Walt, Ellie, Ruth, Joel/,
      /Sheffield lot\s*Grace, Ben/,
      /Tigers U9\s*Priya, Sam/,
      /Studio design team\s*Dev, Sam/,
    ]);
    await expect(groups.connections).toHaveAttribute('href', '/contacts/connections');
  });

  // L2-146 AC2, AC5; L2-148 AC1
  test('opens a group: its people, how you know them, its note, Coming up and its Popkin', async ({
    page,
    pk,
  }) => {
    await marasGroups(page);
    await pk.open('contactsGroupsDetail');
    const groups = new ContactsGroupsPage(page);

    await expect(groups.current).toHaveText(/Thursday Night Group/);
    await expect(groups.over).toHaveText('Small group');
    await expect(groups.name).toHaveText('Thursday Night Group');
    await expect(groups.openPopkin).toHaveText('Open “Thursday Night Group”');
    await expect(groups.openPopkin).toHaveAttribute(
      'href',
      '/p/00000000-0000-4000-e200-000000000001',
    );
    await expect(groups.peopleHeading).toHaveText('4 people');
    await expect(groups.members).toHaveText([
      /Walt Brennan\s*Thursday group\s*Thu/,
      /Ellie Brennan\s*Thursday group\s*Thu/,
      /Ruth Lindqvist\s*Next door, no. 14\s*Sat/,
      /Joel Kim\s*Thursday group\s*Aug 20/,
    ]);
    await expect(groups.members.first()).toHaveAttribute(
      'href',
      `/contacts/people/${memberId('Walt Brennan')}`,
    );
    await expect(groups.note).toHaveText('Thursdays 7:30 at Walt’s. Bring something to share.');
    await expect(groups.comingUp).toHaveText([
      /Ruth’s birthday\s*Oct 24/,
      /Walt’s birthday\s*Nov 16/,
    ]);
  });

  // L2-148 AC2
  test('a group with no Popkin offers to start one with them', async ({ page, pk }) => {
    await marasGroups(page);
    await pk.open('contactsGroupsStart');
    const groups = new ContactsGroupsPage(page);

    await expect(groups.openPopkin).toHaveCount(0);
    await expect(groups.startPopkin).toHaveAttribute(
      'href',
      `/new?group=${groupOf('Sheffield lot')}&name=Sheffield%20lot`,
    );
    await expect(groups.comingUp).toHaveText([
      /Grace’s birthday\s*Sep 19/,
      /Iris is one month old\s*Oct 5/,
      /Grace & Femi’s wedding\s*Dec 26/,
    ]);
  });

  // L2-146 AC2, AC4
  test('on a phone, the open group shows in place of the list, with a way back', async ({
    page,
    pk,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await marasGroups(page);
    await pk.open('contactsGroupsDetail');
    const groups = new ContactsGroupsPage(page);
    await expect(groups.name).toBeFocused();
    await expect(groups.list).toBeHidden();

    await groups.back.click();

    await expect(page).toHaveURL('/contacts/groups');
    await expect(groups.list).toBeVisible();
    await expect(groups.detail).toHaveCount(0);
  });

  // L2-146 AC4
  test('a profile’s group chip opens that group', async ({ page, pk }) => {
    await marasGroups(page);
    await chidiProfile(page, {
      groups: [{ id: groupOf('Chidi & Tomás'), name: 'Chidi & Tomás', emoji: '🏡', accent: 'Sky' }],
    });
    await pk.open('contactProfile');
    const profile = new ContactProfilePage(page);

    await profile.groupChips.getByRole('link', { name: 'Chidi & Tomás' }).click();

    await expect(page).toHaveURL(`/contacts/groups/${groupOf('Chidi & Tomás')}`);
    await expect(new ContactsGroupsPage(page).name).toHaveText('Chidi & Tomás');
  });

  // L2-146 AC3
  test('with no groups, says what a group is for and offers New group', async ({ page, pk }) => {
    await noGroups(page);
    await pk.open('contactsGroupsEmpty');
    const groups = new ContactsGroupsPage(page);

    await expect(groups.stateHeading).toHaveText('No groups yet');
    await expect(groups.stateText).toHaveText(
      'Put a household, a team or a small group together, so their dates and notes sit in one place.',
    );
    await groups.stateNewGroup.click();
    await expect(new NewGroupDialog(page).heading).toHaveText('New group');
  });

  test('a failed read says nothing is lost, and Try again reads again', async ({ page, pk }) => {
    await failNetwork(page, groupsKey);
    await pk.open('contactsGroupsError');
    const groups = new ContactsGroupsPage(page);
    await expect(groups.stateHeading).toHaveText('We couldn’t load your groups');
    await expect(groups.stateText).toHaveText(
      'Nothing is lost. Check your connection and try again.',
    );

    await marasGroups(page);
    await groups.tryAgain.click();

    await expect(groups.items).toHaveCount(6);
  });

  test('says it is loading while the groups are read', async ({ page, pk }) => {
    await hold(page, groupsKey);
    await pk.open('contactsGroupsLoading');

    await expect(new ContactsGroupsPage(page).loading).toBeAttached();
  });
});

test.describe('New group', () => {
  // L2-147 AC2
  test('with no name, sends nothing and says what to fix', async ({ page, pk }) => {
    await marasGroups(page);
    await pk.open('contactsGroups');
    await new ContactsGroupsPage(page).newGroup.click();
    const dialog = new NewGroupDialog(page);
    let sent = false;
    page.on('request', (r) => {
      if (r.method() === 'POST' && r.url().includes('/api/contacts/groups')) sent = true;
    });

    await dialog.make.click();

    await expect(dialog.summary.getByRole('link')).toHaveText(['Name: give the group a name.']);
    await expect(dialog.nameError).toHaveText('Give the group a name, like “Book club”.');
    await expect(dialog.name).toHaveAttribute('aria-invalid', 'true');
    expect(sent).toBe(false);
  });

  // L2-147 AC5
  test('keeps a name to 40 characters', async ({ page, pk }) => {
    await marasGroups(page);
    await pk.open('contactsGroups');
    await new ContactsGroupsPage(page).newGroup.click();
    const dialog = new NewGroupDialog(page);
    await dialog.name.fill('The Thursday night supper and board games crowd');

    await dialog.make.click();

    await expect(dialog.nameError).toHaveText('Keep it to 40 characters.');
  });

  // L2-147 AC1, AC4
  test('makes the group with the people picked, and opens it', async ({ page, pk }) => {
    await marasGroups(page);
    await pk.open('contactsGroups');
    await new ContactsGroupsPage(page).newGroup.click();
    const dialog = new NewGroupDialog(page);
    await expect(dialog.kindChoice('Household')).toHaveAttribute('aria-checked', 'true');
    await expect(dialog.noteHint).toBeVisible();
    await dialog.addPeople.click();
    const add = new GroupAddPeopleDialog(page);
    await expect(add.heading).toHaveText('Add people to the group');
    await add.person('Grace Adeyemi').check();
    await add.person('Ruth Lindqvist').check();
    await add.person('Ben Hale').check();
    await add.add.click();
    await expect(dialog.whoIn).toHaveText([
      /Grace Adeyemi\s*Best friend from uni/,
      /Ruth Lindqvist\s*Next door, no. 14/,
      /Ben Hale\s*Uni friend/,
    ]);
    await dialog.takeOut('Ben').click();
    await dialog.name.fill('Book club');
    await dialog.kindChoice('Club').click();
    await dialog.note.fill('Last Sunday of the month, at the Central Library café.');
    await answer(page, 'POST /api/contacts/groups', { status: 201, body: bookClub() });
    const request = page.waitForRequest(
      (r) => r.method() === 'POST' && r.url().endsWith('/api/contacts/groups'),
    );

    await dialog.make.click();

    expect((await request).postDataJSON()).toEqual({
      clientId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      name: 'Book club',
      kind: 'Club',
      note: 'Last Sunday of the month, at the Central Library café.',
      contactIds: [memberId('Grace Adeyemi'), memberId('Ruth Lindqvist')],
    });
    await expect(dialog.root).toHaveCount(0);
    await expect(page).toHaveURL(/\/contacts\/groups\/00000000-0000-4000-e000-000000000007$/);
    const groups = new ContactsGroupsPage(page);
    await expect(groups.name).toHaveText('Book club');
    await expect(groups.kinds).toHaveText(['Households', 'Small groups', 'Teams', 'Clubs']);
  });

  test('says Making it… while it is sent', async ({ page, pk }) => {
    await marasGroups(page);
    await hold(page, 'POST /api/contacts/groups');
    await pk.open('contactsGroups');
    await new ContactsGroupsPage(page).newGroup.click();
    const dialog = new NewGroupDialog(page);
    await dialog.name.fill('Book club');

    await dialog.make.click();

    await expect(dialog.make).toHaveText('Making it…');
  });

  test('keeps everything when it cannot be made', async ({ page, pk }) => {
    await marasGroups(page);
    await failNetwork(page, 'POST /api/contacts/groups');
    await pk.open('contactsGroups');
    await new ContactsGroupsPage(page).newGroup.click();
    const dialog = new NewGroupDialog(page);
    await dialog.name.fill('Book club');

    await dialog.make.click();

    await expect(dialog.failed).toContainText('We couldn’t make the group.');
    await expect(dialog.name).toHaveValue('Book club');
  });
});

test.describe('Add people', () => {
  // L2-147 AC3
  test('ticks those in the group already, and adds only those newly ticked', async ({
    page,
    pk,
  }) => {
    await marasGroups(page);
    await pk.open('contactsGroupsDetail');
    await new ContactsGroupsPage(page).addPeople.click();
    const add = new GroupAddPeopleDialog(page);

    await expect(add.heading).toHaveText('Add people to Thursday Night Group');
    await expect(add.rows.nth(0)).toHaveText(/Walt Brennan\s*In the group/);
    await expect(add.person('Walt Brennan')).toBeChecked();
    await expect(add.person('Walt Brennan')).toBeDisabled();
    await expect(add.add).toHaveText('Add people');
    await expect(add.add).toBeDisabled();
    await add.person('Dev Patel').check();
    await add.person('Grace Adeyemi').check();
    await expect(add.add).toHaveText('Add 2 people');
    const thursday = groupsAsDrawn()[2] as { members: object[] };
    await answer(page, `POST /api/contacts/groups/${groupOf('Thursday Night Group')}/members`, {
      status: 200,
      body: thursday,
    });
    const request = page.waitForRequest(
      (r) => r.method() === 'POST' && r.url().includes('/members'),
    );

    await add.add.click();

    expect((await request).postDataJSON()).toEqual({
      contactIds: [memberId('Dev Patel'), memberId('Grace Adeyemi')],
    });
    await expect(add.root).toHaveCount(0);
  });
});

test.describe('A group and its Popkin', () => {
  // L2-148 AC3
  test('Start a Popkin with them names it after the group and invites them once it is made', async ({
    page,
    pk,
  }) => {
    await marasGroups(page);
    const asked: string[] = [];
    await page.route('**/api/contacts/groups/*/popkin', (route) => {
      asked.push(new URL(route.request().url()).pathname.split('/')[4]);
      return route.fulfill({ status: 202 });
    });
    await pk.open('contactsGroupsStart');
    await new ContactsGroupsPage(page).startPopkin.click();
    const name = new NameYourPopkinPage(page);

    await expect(name.name).toHaveValue('Sheffield lot');
    await name.looksGood.click();
    await new HowLongPage(page).popItUp.click();

    await expect(page).toHaveURL(new RegExp(`/p/${created.id}/created$`));
    expect(asked).toEqual([groupOf('Sheffield lot')]);
  });
});

test.describe('Groups in the contact form', () => {
  // L2-147 AC6
  test('Add someone lists the groups as toggles and sends those pressed', async ({ page, pk }) => {
    await marasGroups(page);
    await pk.open('addContact');
    const form = new ContactFormPage(page);
    await form.name.fill('Femi Bankole');
    await expect(form.groups.getByRole('button')).toHaveText([
      /Mum’s house/,
      /Chidi & Tomás/,
      /Thursday Night Group/,
      /Sheffield lot/,
      /Tigers U9/,
      /Studio design team/,
    ]);
    await form.group('Sheffield lot').click();
    await expect(form.group('Sheffield lot')).toHaveAttribute('aria-pressed', 'true');
    const request = page.waitForRequest(
      (r) => r.method() === 'POST' && r.url().endsWith('/api/contacts/people'),
    );

    await form.save.click();

    expect(contactSent(await request)).toMatchObject({ groupIds: [groupOf('Sheffield lot')] });
  });

  test('with no groups, the part is left out', async ({ page, pk }) => {
    await noGroups(page);
    await answer(page, peopleKey, { status: 200, body: peopleOfTheGroups() });
    await pk.open('addContact');

    await expect(new ContactFormPage(page).groups).toHaveCount(0);
  });
});
