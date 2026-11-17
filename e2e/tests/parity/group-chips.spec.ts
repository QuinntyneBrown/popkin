import { chidiProfile, contactsMorning } from '../../fixtures/contacts';
import { groupOf } from '../../fixtures/groups';
import { parity } from '../../fixtures/parity';
import { ContactProfilePage } from '../../pages/contact-profile.page';

parity('group-chips', [
  // Chidi & Tomás, under the people around Chidi.
  {
    key: 'contactProfile',
    name: 'around',
    region: (page) => new ContactProfilePage(page).groupChips,
    before: async (page) => {
      await page.clock.install({ time: contactsMorning });
      await chidiProfile(page, {
        groups: [
          { id: groupOf('Chidi & Tomás'), name: 'Chidi & Tomás', emoji: '🏡', accent: 'Sky' },
        ],
      });
    },
    snap: true,
  },
]);
