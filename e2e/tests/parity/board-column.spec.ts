import { parity } from '../../fixtures/parity';
import { theMockPlan } from '../../fixtures/plan';
import { PlanBoardPage } from '../../pages/plan-board.page';

const column = (name: string) => (page: import('@playwright/test').Page) =>
  new PlanBoardPage(page).column(name).root;

// A column takes the height the header leaves it; below 640 px the mocks' header carries the
// sprint chip (L2-068 AC7), so the columns are compared at 1280 px, where all four show.
parity('board-column', [
  {
    key: 'planBoard',
    name: 'backlog',
    region: column('Backlog'),
    before: theMockPlan,
    widths: [1280],
  },
  {
    key: 'planBoard',
    name: 'doing',
    region: column('Doing'),
    before: theMockPlan,
    widths: [1280],
  },
]);
