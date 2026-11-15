import { parity } from '../../fixtures/parity';
import { theMockPlan } from '../../fixtures/plan';
import { PlanBoardPage } from '../../pages/plan-board.page';

// The chip on the board's header: its sparkline, "24 pts left · 7 behind" (L2-068 AC7).
parity('sprint-chip', [
  {
    key: 'planBoard',
    name: 'default',
    region: (page) => new PlanBoardPage(page).sprintChip,
    before: theMockPlan,
  },
]);
