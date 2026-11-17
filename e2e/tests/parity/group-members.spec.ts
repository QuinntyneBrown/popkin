import { parity } from '../../fixtures/parity';
import { ContactsGroupsPage } from '../../pages/contacts-groups.page';
import { groupsAsDrawn } from './group-steps';

parity('group-members', [
  // Thursday Night Group's four, each with how Mara knows them and when they last talked.
  {
    key: 'contactsGroupsDetail',
    name: 'thursday',
    region: (page) => new ContactsGroupsPage(page).memberList,
    before: groupsAsDrawn,
    snap: true,
  },
  // Sheffield lot's two.
  {
    key: 'contactsGroupsStart',
    name: 'sheffield',
    region: (page) => new ContactsGroupsPage(page).memberList,
    before: groupsAsDrawn,
    snap: true,
  },
]);
