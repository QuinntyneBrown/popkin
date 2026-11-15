import { parity } from '../../fixtures/parity';
import { theMockPlan, thePlanLoading } from '../../fixtures/plan';
import { PlanBoardPage } from '../../pages/plan-board.page';

const board = (page: import('@playwright/test').Page) => new PlanBoardPage(page).board;

// The board takes the height the header, with its sprint chip (L2-068 AC7), leaves it.
parity('board', [
  { key: 'planBoard', name: 'default', region: board, before: theMockPlan },
  { key: 'planBoardLoading', name: 'loading', region: board, before: thePlanLoading },
]);
