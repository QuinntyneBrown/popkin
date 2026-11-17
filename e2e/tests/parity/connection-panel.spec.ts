import { parity } from '../../fixtures/parity';
import { ContactsConnectionsPage } from '../../pages/contacts-connections.page';
import { chooseChidi, connectionsAsDrawn } from './connection-steps';

const panel = (page: import('@playwright/test').Page) => new ContactsConnectionsPage(page).panel;

parity('connection-panel', [
  // Nobody chosen: how to use the map and what its lines mean.
  {
    key: 'contactsConnections',
    name: 'hint',
    region: panel,
    before: connectionsAsDrawn,
    snap: true,
  },
  // Chidi chosen: his name, Brother, his people and the actions.
  {
    key: 'contactsConnectionsChidi',
    name: 'chosen',
    region: panel,
    before: connectionsAsDrawn,
    app: async (page) => void (await chooseChidi(page)),
    snap: true,
  },
]);
