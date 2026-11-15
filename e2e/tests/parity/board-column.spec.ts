import { parity } from '../../fixtures/parity';
import { theMockPlan } from '../../fixtures/plan';
import { PlanBoardPage } from '../../pages/plan-board.page';

const column = (name: string) => (page: import('@playwright/test').Page) =>
  new PlanBoardPage(page).column(name).root;

// A column takes the height the header, with its sprint chip (L2-068 AC7), leaves it.
parity('board-column', [
  {
    key: 'planBoard',
    name: 'backlog',
    region: column('Backlog'),
    before: theMockPlan,
  },
  {
    key: 'planBoard',
    name: 'doing',
    region: column('Doing'),
    before: theMockPlan,
  },
]);
