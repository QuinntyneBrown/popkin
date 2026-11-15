import { parity } from '../../fixtures/parity';
import { theMockPlan } from '../../fixtures/plan';
import { PopkinHomePage } from '../../pages/popkin-home.page';

// The home's Plan card: "24 pts left", "7 behind" and the biggest open (L2-075 AC1).
parity('plan-card', [
  {
    key: 'popkinHomePlan',
    name: 'default',
    region: (page) => new PopkinHomePage(page).planCard,
    before: theMockPlan,
    // The home's sections above it differ from the mock's by a fraction of a pixel.
    snap: true,
  },
]);
