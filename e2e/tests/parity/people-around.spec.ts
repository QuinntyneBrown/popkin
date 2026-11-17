import { parity } from '../../fixtures/parity';
import { ContactsConnectionsPage } from '../../pages/contacts-connections.page';
import { chooseChidi, connectionsAsDrawn } from './connection-steps';

parity('people-around', [
  // Chidi's people on the panel: You · Brother, Tomás Reyes · Married, each keyed.
  {
    key: 'contactsConnectionsChidi',
    name: 'panel',
    region: (page) => new ContactsConnectionsPage(page).panel.locator('ul.divided'),
    before: connectionsAsDrawn,
    app: async (page) => void (await chooseChidi(page)),
    snap: true,
  },
]);
