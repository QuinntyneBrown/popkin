import type { Page } from '@playwright/test';
import type { RouteKey } from './routes';
import { theMockPlan, thePlanEmpty, thePlanFailing, thePlanLoading, thePlanOff } from './plan';

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
} satisfies Partial<Record<RouteKey, PlanState>>;
