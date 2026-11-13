import { inviteFailsOnTheServer, theInviteFailing } from '../../fixtures/journeys';
import { JoinInvitePage } from '../../pages/join-invite.page';
import { ServerErrorPage } from '../../pages/server-error.page';
import { parity } from '../../fixtures/parity';
import { NotFoundPage } from '../../pages/not-found.page';

parity('empty-state', [
  { key: 'notFound', region: (page) => new NotFoundPage(page).emptyState },
  {
    key: 'serverErrorWithReference',
    name: 'server-error',
    region: (page) => new ServerErrorPage(page).emptyState,
    before: inviteFailsOnTheServer,
  },
  {
    key: 'joinInviteError',
    name: 'invite-error',
    region: (page) => new JoinInvitePage(page).emptyState,
    before: theInviteFailing,
  },
]);
