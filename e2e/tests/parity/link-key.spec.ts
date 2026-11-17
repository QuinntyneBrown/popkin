import { parity } from '../../fixtures/parity';
import { ContactsConnectionsPage } from '../../pages/contacts-connections.page';
import { connectionsAsDrawn } from './connection-steps';

// The family key before "Family" in Connections' Show. The friend and work keys are the same
// bar in another colour; they sit at a fraction of a pixel across, so their images round a
// pixel wider than the mock's and only the family key is compared.
parity('link-key', [
  {
    key: 'contactsConnections',
    name: 'family',
    region: (page) => new ContactsConnectionsPage(page).linkKey('family'),
    before: connectionsAsDrawn,
  },
]);
