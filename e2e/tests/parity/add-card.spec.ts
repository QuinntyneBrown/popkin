import { parity } from '../../fixtures/parity';
import { ContactProfilePage } from '../../pages/contact-profile.page';
import { contactsMorning, femiProfile } from '../../fixtures/contacts';

parity('add-card', [
  // "Make a habit" on Femi's profile, which has none.
  {
    key: 'contactProfileEmpty',
    name: 'habit',
    region: (page) => new ContactProfilePage(page).makeHabit,
    before: async (page) => {
      await page.clock.install({ time: contactsMorning });
      await femiProfile(page);
    },
    snap: true,
  },
]);
