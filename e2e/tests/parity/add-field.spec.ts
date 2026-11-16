import { chidiProfile, contactsMorning } from '../../fixtures/contacts';
import { parity } from '../../fixtures/parity';
import { ContactProfilePage } from '../../pages/contact-profile.page';

parity('add-field', [
  // A profile's "Something to do for Chidi…", across the history's width.
  {
    key: 'contactProfileFollowUps',
    name: 'profile',
    region: (page) => new ContactProfilePage(page).addField,
    before: async (page) => {
      await page.clock.install({ time: contactsMorning });
      await chidiProfile(page);
    },
    snap: true,
  },
]);
