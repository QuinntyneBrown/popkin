import { joelAtTheMockInvite, joinFromTheInvite } from '../../fixtures/journeys';
import { parity } from '../../fixtures/parity';
import { YoureInPage } from '../../pages/youre-in.page';

parity('arrival', [
  {
    key: 'youreIn',
    name: 'six-around',
    region: (page) => new YoureInPage(page).arrival,
    before: joelAtTheMockInvite,
    app: joinFromTheInvite,
  },
]);
