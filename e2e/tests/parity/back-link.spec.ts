import { chidiProfile } from '../../fixtures/contacts';
import { parity } from '../../fixtures/parity';
import { ContactProfilePage } from '../../pages/contact-profile.page';

parity('back-link', [
  // A profile's way back to People, beside its actions.
  {
    key: 'contactProfile',
    name: 'contact-profile',
    region: (page) => new ContactProfilePage(page).back,
    before: (page) => chidiProfile(page),
  },
]);
