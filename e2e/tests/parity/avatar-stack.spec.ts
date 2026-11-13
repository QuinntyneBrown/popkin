import { theMockHome } from '../../fixtures/home';
import { PopkinHomePage } from '../../pages/popkin-home.page';
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
  {
    key: 'popkinHome',
    name: 'xs',
    region: (page) => new PopkinHomePage(page).stack,
    before: theMockHome,
  },
]);
