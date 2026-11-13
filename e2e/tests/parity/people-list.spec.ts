import { joelAtTheMockInvite } from '../../fixtures/journeys';
import { parity } from '../../fixtures/parity';
import { YourProfilePage } from '../../pages/your-profile.page';

// The list sits in the aside, which is not rendered below 768 px.
parity('people-list', [
  {
    key: 'yourProfile',
    name: 'eight-and-more',
    region: (page) => new YourProfilePage(page).picture,
    before: joelAtTheMockInvite,
    widths: [1280],
  },
]);
