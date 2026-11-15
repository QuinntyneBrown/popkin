import { parity } from '../../fixtures/parity';
import { theMockPlan, thePlanLoading } from '../../fixtures/plan';
import { PlanBoardPage } from '../../pages/plan-board.page';

const board = (page: import('@playwright/test').Page) => new PlanBoardPage(page).board;

// The board takes the height the header leaves it. Below 640 px the mocks' header carries the
// sprint chip, which the board gains with its burn-down (L2-068 AC7); until then, 1280 px.
parity('board', [
  { key: 'planBoard', name: 'default', region: board, before: theMockPlan, widths: [1280] },
  {
    key: 'planBoardLoading',
    name: 'loading',
    region: board,
    before: thePlanLoading,
    widths: [1280],
  },
]);
