import { theInviteFailing, theMockInvite, theMockWrappedInvite } from '../../fixtures/journeys';
import { parity } from '../../fixtures/parity';
import { JoinInvitePage } from '../../pages/join-invite.page';
import { NotFoundPage } from '../../pages/not-found.page';

parity('screen', [
  { key: 'notFound', region: (page) => new NotFoundPage(page).screen },
  {
    key: 'joinInvite',
    name: 'invite',
    region: (page) => new JoinInvitePage(page).screen,
    before: theMockInvite,
  },
  {
    key: 'joinInviteWrapped',
    name: 'invite-wrapped-up',
    region: (page) => new JoinInvitePage(page).screen,
    before: theMockWrappedInvite,
  },
  {
    key: 'joinInviteError',
    name: 'invite-error',
    region: (page) => new JoinInvitePage(page).screen,
    before: theInviteFailing,
  },
]);
