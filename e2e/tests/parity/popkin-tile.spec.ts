import { theMockInvite, theMockWrappedInvite } from '../../fixtures/journeys';
import { parity } from '../../fixtures/parity';
import { JoinInvitePage } from '../../pages/join-invite.page';
import { NameYourPopkinPage } from '../../pages/name-your-popkin.page';

parity('popkin-tile', [
  {
    key: 'nameYourPopkinFilled',
    name: 'lg-teal',
    region: (page) => new NameYourPopkinPage(page).preview,
    app: (page) => new NameYourPopkinPage(page).chooseLakeside(),
  },
  {
    key: 'joinInvite',
    name: '2xl-teal',
    region: (page) => new JoinInvitePage(page).tile,
    before: theMockInvite,
  },
  {
    key: 'joinInviteWrapped',
    name: '2xl-muted',
    region: (page) => new JoinInvitePage(page).tile,
    before: theMockWrappedInvite,
  },
]);
