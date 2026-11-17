import type { Page } from '@playwright/test';
import { contactsMorning, peopleKey } from '../../fixtures/contacts';
import { marasGroups, peopleOfTheGroups } from '../../fixtures/groups';
import { answer } from '../../fixtures/stubs';
import { ContactsGroupsPage } from '../../pages/contacts-groups.page';
import { GroupAddPeopleDialog } from '../../pages/group-add-people.dialog';

/** Mara's groups on the mocks' morning, as Groups draws them. */
export async function groupsAsDrawn(page: Page): Promise<void> {
  await page.clock.install({ time: contactsMorning });
  await marasGroups(page);
}

/** Add people for Thursday Night Group with Dev and Grace ticked, as its default draws it. */
export async function addDevAndGrace(page: Page): Promise<GroupAddPeopleDialog> {
  await new ContactsGroupsPage(page).addPeople.click();
  const dialog = new GroupAddPeopleDialog(page);
  await dialog.person('Dev Patel').check();
  await dialog.person('Grace Adeyemi').check();
  return dialog;
}

/** The groups as drawn, with People holding only the eight Add people's mock lists. */
export async function addPeopleAsDrawn(page: Page): Promise<void> {
  await groupsAsDrawn(page);
  const drawn = ['Walt', 'Ellie', 'Ruth', 'Joel', 'Ben', 'Dev', 'Grace', 'Priya'];
  const people = peopleOfTheGroups() as { contacts: { firstName: string }[] };
  await answer(page, peopleKey, {
    status: 200,
    body: { ...people, contacts: people.contacts.filter((c) => drawn.includes(c.firstName)) },
  });
}
