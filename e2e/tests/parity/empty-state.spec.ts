import { inviteFailsOnTheServer } from '../../fixtures/journeys';
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
]);
