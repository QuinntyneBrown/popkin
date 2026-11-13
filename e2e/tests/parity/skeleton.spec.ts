import { theInviteLoading } from '../../fixtures/journeys';
import { parity } from '../../fixtures/parity';
import { JoinInvitePage } from '../../pages/join-invite.page';

parity('skeleton', [
  {
    key: 'joinInviteLoading',
    name: 'button',
    region: (page) => new JoinInvitePage(page).buttonSkeleton,
    before: theInviteLoading,
  },
]);
