import { parity } from '../../fixtures/parity';
import { theMockPlan, thePlanBurnedDown } from '../../fixtures/plan';
import { BurnDownPage } from '../../pages/burn-down.page';

const burn = (page: import('@playwright/test').Page) => new BurnDownPage(page).burn;

parity('burn', [
  { key: 'burnDown', name: 'default', region: burn, before: theMockPlan },
  { key: 'burnDownDone', name: 'done', region: burn, before: thePlanBurnedDown },
]);
