import { parity } from '../../fixtures/parity';
import { ContactsConnectionsPage } from '../../pages/contacts-connections.page';
import { chooseChidi, connectionsAsDrawn } from './connection-steps';

const map = (page: import('@playwright/test').Page) => new ContactsConnectionsPage(page).map;

parity('connection-map', [
  // Everyone, nobody chosen: twelve faces, their lines, one dotted.
  { key: 'contactsConnections', name: 'none', region: map, before: connectionsAsDrawn, snap: true },
  // Chidi chosen: his lines on, the rest dim.
  {
    key: 'contactsConnectionsChidi',
    name: 'focus',
    region: map,
    before: connectionsAsDrawn,
    app: async (page) => void (await chooseChidi(page)),
    snap: true,
  },
  // Family: only family and partner lines.
  {
    key: 'contactsConnectionsFamily',
    name: 'family',
    region: map,
    before: connectionsAsDrawn,
    app: async (page) => {
      await new ContactsConnectionsPage(page).filter('Family').click();
    },
    snap: true,
  },
]);
