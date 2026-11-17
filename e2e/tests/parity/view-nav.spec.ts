import { chidiProfile, contactsMorning } from '../../fixtures/contacts';
import { parity } from '../../fixtures/parity';
import { ContactProfilePage } from '../../pages/contact-profile.page';
import { theMockTimeOff } from '../../fixtures/schedule';
import { TimeOffPage } from '../../pages/time-off.page';

parity('view-nav', [
  {
    key: 'timeOff',
    name: 'time-off',
    region: (page) => new TimeOffPage(page).views,
    before: theMockTimeOff,
  },
  // A profile's history, "Follow-ups 1" chosen.
  {
    key: 'contactProfileFollowUps',
    name: 'count',
    region: (page) => new ContactProfilePage(page).historyNav,
    before: async (page) => {
      await page.clock.install({ time: contactsMorning });
      await chidiProfile(page);
    },
    snap: true,
  },
]);
