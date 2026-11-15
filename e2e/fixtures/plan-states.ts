import type { Page } from '@playwright/test';
import type { RouteKey } from './routes';
import { expect } from '@playwright/test';
import { DeleteStoryDialog } from '../pages/delete-story.dialog';
import {
  openNewStory,
  openStory,
  planOf,
  theMockPlan,
  thePlanAsSam,
  thePlanBurnedDown,
  thePlanEmpty,
  thePlanFailing,
  thePlanLoading,
  thePlanOff,
  thePlanWrappedUp,
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
  planBoardReadOnly: { before: thePlanWrappedUp },
  burnDown: { before: theMockPlan },
  burnDownLoading: { before: thePlanLoading },
  burnDownEmpty: { before: thePlanEmpty },
  burnDownError: { before: thePlanFailing },
  burnDownOff: { before: thePlanOff },
  burnDownDone: { before: thePlanBurnedDown },
  popkinHomePlan: { before: theMockPlan },
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
  storyNoDelete: {
    before: thePlanAsSam,
    app: async (page) => void (await openStory(page, 'Rent a 7-seat van')),
  },
  deleteStory: {
    before: theMockPlan,
    app: async (page) => {
      await (await openStory(page)).delete.click();
      await new DeleteStoryDialog(page).keep.waitFor();
    },
  },
  deleteStoryBusy: {
    before: theMockPlan,
    app: async (page) => {
      await (await openStory(page)).delete.click();
      planOf(page).holdWrites();
      await new DeleteStoryDialog(page).delete.click();
    },
  },
  deleteStoryFailed: {
    before: theMockPlan,
    app: async (page) => {
      await (await openStory(page)).delete.click();
      planOf(page).failWrites();
      const confirm = new DeleteStoryDialog(page);
      await confirm.delete.click();
      await expect(confirm.failed).toBeVisible();
    },
  },
} satisfies Partial<Record<RouteKey, PlanState>>;
