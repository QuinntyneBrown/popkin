import { theInviteLoading, theMockInvite, theMockWrappedInvite } from '../../fixtures/journeys';
import { parity } from '../../fixtures/parity';
import { JoinInvitePage } from '../../pages/join-invite.page';

parity('invite-preview', [
  {
    key: 'joinInvite',
    name: 'open',
    region: (page) => new JoinInvitePage(page).preview,
    before: theMockInvite,
  },
  {
    key: 'joinInviteWrapped',
    name: 'wrapped-up',
    region: (page) => new JoinInvitePage(page).preview,
    before: theMockWrappedInvite,
  },
  {
    key: 'joinInviteLoading',
    name: 'loading',
    region: (page) => new JoinInvitePage(page).skeletonGroup,
    before: theInviteLoading,
  },
]);
