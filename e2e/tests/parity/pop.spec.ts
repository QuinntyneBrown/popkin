import { lakesideInvite } from '../../fixtures/journeys';
import { parity } from '../../fixtures/parity';
import { PopkinCreatedPage } from '../../pages/popkin-created.page';

// Parity runs with reduced motion, so the tile shows without its confetti in both targets.
parity('pop', [
  {
    key: 'popkinCreated',
    region: (page) => new PopkinCreatedPage(page).pop,
    before: lakesideInvite,
  },
]);
