import { parity } from '../../fixtures/parity';
import { ContactsGroupsPage } from '../../pages/contacts-groups.page';
import { groupsAsDrawn } from './group-steps';

parity('coming-up', [
  // Ruth's and Walt's birthdays.
  {
    key: 'contactsGroupsDetail',
    name: 'two',
    region: (page) => new ContactsGroupsPage(page).comingUpList,
    before: groupsAsDrawn,
    snap: true,
  },
  // Grace's birthday, Iris at one month, and the wedding.
  {
    key: 'contactsGroupsStart',
    name: 'three',
    region: (page) => new ContactsGroupsPage(page).comingUpList,
    before: groupsAsDrawn,
    snap: true,
  },
]);
