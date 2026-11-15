import { parity } from '../../fixtures/parity';
import { theMockPlan } from '../../fixtures/plan';
import { PlanBoardPage } from '../../pages/plan-board.page';

const card = (title: string) => (page: import('@playwright/test').Page) =>
  new PlanBoardPage(page).card(title).root;

parity('story-card', [
  {
    key: 'planBoard',
    name: 'no owner',
    region: card('Kayak rental for two days'),
    before: theMockPlan,
  },
  // Owned, due and done cards sit in columns out of view below 640 px.
  {
    key: 'planBoard',
    name: 'owned and due',
    region: card('Book the cabin at Pine Hollow'),
    before: theMockPlan,
    widths: [1280],
  },
  {
    key: 'planBoard',
    name: 'done',
    region: card('Choose the lake'),
    before: theMockPlan,
    widths: [1280],
  },
]);
