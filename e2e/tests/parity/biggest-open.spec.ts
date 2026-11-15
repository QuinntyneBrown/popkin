import { parity } from '../../fixtures/parity';
import { theMockPlan, thePlanBurnedDown } from '../../fixtures/plan';
import { BurnDownPage } from '../../pages/burn-down.page';

const biggest = (page: import('@playwright/test').Page) => new BurnDownPage(page).biggest;

parity('biggest-open', [
  { key: 'burnDown', name: 'default', region: biggest, before: theMockPlan },
  { key: 'burnDownDone', name: 'nothing-open', region: biggest, before: thePlanBurnedDown },
]);
