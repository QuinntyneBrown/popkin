import { chidiProfile, contactsMorning } from '../../fixtures/contacts';
import { parity } from '../../fixtures/parity';
import { ContactProfilePage } from '../../pages/contact-profile.page';

const chidi = async (page: import('@playwright/test').Page) => {
  await page.clock.install({ time: contactsMorning });
  await chidiProfile(page);
};

parity('contact-timeline', [
  // The phone call on Sep 6: its channel and note.
  {
    key: 'contactProfile',
    name: 'conversation',
    region: (page) => new ContactProfilePage(page).timelineEntries.nth(0),
    before: chidi,
    snap: true,
  },
  // Chidi's new job on Aug 31: its kind, title and note.
  {
    key: 'contactProfile',
    name: 'milestone',
    region: (page) => new ContactProfilePage(page).timelineEntries.nth(1),
    before: chidi,
    snap: true,
  },
]);
