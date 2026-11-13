import { theMockInvite } from '../../fixtures/journeys';
import { parity } from '../../fixtures/parity';
import { JoinInvitePage } from '../../pages/join-invite.page';

parity('wordmark', [
  {
    key: 'joinInvite',
    name: 'coral',
    region: (page) => new JoinInvitePage(page).wordmark,
    before: theMockInvite,
  },
]);
