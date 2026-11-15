import { parity } from '../../fixtures/parity';
import { theMockPlan, thePlanBurnedDown } from '../../fixtures/plan';
import { BurnDownPage } from '../../pages/burn-down.page';

const chart = (page: import('@playwright/test').Page) => new BurnDownPage(page).chart;

parity('burn-chart', [
  { key: 'burnDown', name: 'default', region: chart, before: theMockPlan },
  { key: 'burnDownDone', name: 'done', region: chart, before: thePlanBurnedDown },
]);
