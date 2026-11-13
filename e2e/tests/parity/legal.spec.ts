import { theMockInvite } from '../../fixtures/journeys';
import { parity } from '../../fixtures/parity';
import { JoinInvitePage } from '../../pages/join-invite.page';
import { SignUpPage } from '../../pages/sign-up.page';

parity('legal', [
  { key: 'signUp', region: (page) => new SignUpPage(page).legal },
  {
    key: 'joinInvite',
    name: 'note',
    region: (page) => new JoinInvitePage(page).note,
    before: theMockInvite,
  },
]);
