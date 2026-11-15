import { parity } from '../../fixtures/parity';
import { theMockPlan } from '../../fixtures/plan';
import { BurnDownPage } from '../../pages/burn-down.page';
import { PopkinHomePage } from '../../pages/popkin-home.page';

// The rows of the biggest open stories, beside the burn-down's chart and on the home's Plan card
// (L2-071 AC6, L2-075 AC1).
parity('biggest-rows', [
  {
    key: 'burnDown',
    name: 'burn-down',
    region: (page) => new BurnDownPage(page).biggestList,
    before: theMockPlan,
  },
  {
    key: 'popkinHomePlan',
    name: 'home',
    region: (page) => new PopkinHomePage(page).planList,
    before: theMockPlan,
    snap: true,
  },
]);
