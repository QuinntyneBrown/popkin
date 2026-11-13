import { theMockInvite } from '../../fixtures/journeys';
import { parity } from '../../fixtures/parity';
import { JoinInvitePage } from '../../pages/join-invite.page';

parity('pill', [
  {
    key: 'joinInvite',
    name: 'invited-by',
    region: (page) => new JoinInvitePage(page).invitedBy,
    before: theMockInvite,
  },
]);
