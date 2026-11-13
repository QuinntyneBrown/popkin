import { theMockInvite } from '../../fixtures/journeys';
import { parity } from '../../fixtures/parity';
import { JoinInvitePage } from '../../pages/join-invite.page';

parity('avatar-stack', [
  {
    key: 'joinInvite',
    name: 'five-and-more',
    region: (page) => new JoinInvitePage(page).avatarStack,
    before: theMockInvite,
  },
]);
