import { parity } from '../../fixtures/parity';
import { theMockPlan } from '../../fixtures/plan';
import { PlanBoardPage } from '../../pages/plan-board.page';

// The points left over the sprint against the dashed ideal (L2-068 AC7).
parity('sparkline', [
  {
    key: 'planBoard',
    name: 'default',
    region: (page) => new PlanBoardPage(page).sparkline,
    before: theMockPlan,
  },
]);
