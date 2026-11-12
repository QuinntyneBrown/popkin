import { lakesideInvite, withShareSheet } from '../../fixtures/journeys';
import { parity } from '../../fixtures/parity';
import { PopkinCreatedPage } from '../../pages/popkin-created.page';

parity('share-action', [
  {
    key: 'popkinCreated',
    name: 'text-it',
    region: (page) => new PopkinCreatedPage(page).textItRegion,
    before: async (page) => {
      await lakesideInvite(page);
      await withShareSheet(page);
    },
  },
]);
