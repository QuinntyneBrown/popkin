import { theMockInvite } from '../../fixtures/journeys';
import { parity } from '../../fixtures/parity';
import { ContactProfilePage } from '../../pages/contact-profile.page';
import { JoinInvitePage } from '../../pages/join-invite.page';
import { chidiAsDrawn } from './habit-steps';

parity('cluster', [
  // The profile's head: People at one end, Edit and More at the other (`justify="between"`).
  // At 360 px Edit and More sit about 4 px further apart than the mock draws them (known gap
  // 122), a difference inside the actions, not in the cluster; 1280 px compares the cluster.
  {
    key: 'contactProfile',
    name: 'between',
    region: (page) => new ContactProfilePage(page).head,
    before: chidiAsDrawn,
    snap: true,
    widths: [1280],
  },
  // The wordmark over an invite (`justify="center"`).
  {
    key: 'joinInvite',
    name: 'center',
    region: (page) => new JoinInvitePage(page).brand,
    before: theMockInvite,
  },
]);
