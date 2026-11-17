import { parity } from '../../fixtures/parity';
import { ContactsGroupsPage } from '../../pages/contacts-groups.page';
import { groupsAsDrawn } from './group-steps';

parity('info-line', [
  // A group's note on its card.
  {
    key: 'contactsGroups',
    name: 'note',
    region: (page) => new ContactsGroupsPage(page).noteLine,
    before: groupsAsDrawn,
    widths: [1280],
  },
]);
