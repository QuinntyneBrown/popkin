import { theMockInvite } from '../../fixtures/journeys';
import { parity } from '../../fixtures/parity';
import { JoinInvitePage } from '../../pages/join-invite.page';
import { WelcomePage } from '../../pages/welcome.page';

parity('wordmark', [
  {
    key: 'joinInvite',
    name: 'coral',
    region: (page) => new JoinInvitePage(page).wordmark,
    before: theMockInvite,
  },
  { key: 'welcome', name: 'coral-lg', region: (page) => new WelcomePage(page).wordmark },
]);
