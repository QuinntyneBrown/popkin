import { parity } from '../../fixtures/parity';
import { ContactProfilePage } from '../../pages/contact-profile.page';
import { chidiAsDrawn } from './habit-steps';

parity('contact-timeline-item', [
  // A conversation, the first on Chidi's timeline.
  {
    key: 'contactProfile',
    name: 'conversation',
    region: (page) => new ContactProfilePage(page).timelineEntries.nth(0),
    before: chidiAsDrawn,
    snap: true,
  },
  // A milestone, the second.
  {
    key: 'contactProfile',
    name: 'milestone',
    region: (page) => new ContactProfilePage(page).timelineEntries.nth(1),
    before: chidiAsDrawn,
    snap: true,
  },
]);
