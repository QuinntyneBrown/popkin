import type { Page } from '@playwright/test';
import type { RouteKey } from './routes';
import { expect } from '@playwright/test';
import {
  openNewStory,
  openStory,
  planOf,
  theMockPlan,
  thePlanEmpty,
  thePlanFailing,
  thePlanLoading,
  thePlanOff,
} from './plan';

/*
 * The states of the Plan the mocks draw (journey 21), for the sweeps: `before` is the step
 * before the page opens, `app` what brings the open page to the state. Written and kept current;
 * only the repository owner runs the sweeps (ADR 0006).
 */

interface PlanState {
  before: (page: Page) => Promise<void>;
  app?: (page: Page) => Promise<void>;
}

export const planStates = {
  planBoard: { before: theMockPlan },
  planBoardLoading: { before: thePlanLoading },
  planBoardEmpty: { before: thePlanEmpty },
  planBoardError: { before: thePlanFailing },
  planBoardOff: { before: thePlanOff },
  newStory: { before: theMockPlan, app: async (page) => void (await openNewStory(page)) },
  newStoryBusy: {
    before: theMockPlan,
    app: async (page) => {
      const dialog = await openNewStory(page);
      planOf(page).holdWrites();
      await dialog.action.click();
    },
  },
  newStoryInvalid: {
    before: theMockPlan,
    app: async (page) => {
      const dialog = await openNewStory(page, false);
      await dialog.member('Ellie').click();
      await dialog.action.click();
    },
  },
  newStoryFailed: {
    before: theMockPlan,
    app: async (page) => {
      const dialog = await openNewStory(page);
      planOf(page).failWrites();
      await dialog.action.click();
      await expect(dialog.failed).toBeVisible();
    },
  },
  story: { before: theMockPlan, app: async (page) => void (await openStory(page)) },
  storyDone: {
    before: theMockPlan,
    app: async (page) => void (await openStory(page, 'Collect $150 deposits')),
  },
  storyBusy: {
    before: theMockPlan,
    app: async (page) => {
      const dialog = await openStory(page);
      planOf(page).holdWrites();
      await dialog.save.click();
    },
  },
  storyFailed: {
    before: theMockPlan,
    app: async (page) => {
      const dialog = await openStory(page);
      planOf(page).failWrites();
      await dialog.save.click();
      await expect(dialog.failed).toBeVisible();
    },
  },
} satisfies Partial<Record<RouteKey, PlanState>>;
