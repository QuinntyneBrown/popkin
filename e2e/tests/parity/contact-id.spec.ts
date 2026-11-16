import { chidiProfile, femiProfile } from '../../fixtures/contacts';
import { parity } from '../../fixtures/parity';
import { ContactProfilePage } from '../../pages/contact-profile.page';

parity('contact-id', [
  // Chidi: his photo, the Popkin we share, Message, Call and Log.
  {
    key: 'contactProfile',
    name: 'phone',
    region: (page) => new ContactProfilePage(page).header,
    before: (page) =>
      chidiProfile(page, { alsoIn: { popkinId: 'lakeside', name: 'Lakeside Weekend' } }),
  },
  // Femi: initials, and Email in place of Message and Call.
  {
    key: 'contactProfileEmpty',
    name: 'email-only',
    region: (page) => new ContactProfilePage(page).header,
    before: (page) => femiProfile(page, { knownAs: 'Grace’s fiancé', city: 'London' }),
  },
]);
