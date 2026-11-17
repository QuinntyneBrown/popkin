import { parity } from '../../fixtures/parity';
import { ContactsGroupsPage } from '../../pages/contacts-groups.page';
import { groupsAsDrawn } from './group-steps';

parity('group-browser', [
  // The groups under their kinds, Thursday Night Group current.
  {
    key: 'contactsGroups',
    name: 'list',
    region: (page) => new ContactsGroupsPage(page).list,
    before: groupsAsDrawn,
    widths: [1280],
  },
]);
