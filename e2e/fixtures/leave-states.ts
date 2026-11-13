import type { Page } from '@playwright/test';
import { homeNow } from './home';
import { type Leaving, aMemberAtHome, openLeave } from './leaving';
import type { RouteKey } from './routes';

/*
 * The states of leaving a Popkin the mocks draw, for the sweeps and the parity specs: `before`
 * is the step before the page opens, `app` what brings the open page to the state.
 */

/** A member at the home of the mocks, on the mocks' day. */
const atHome = (arrange?: (leaving: Leaving) => void) => async (page: Page) => {
  await page.clock.install({ time: homeNow });
  const leaving = await aMemberAtHome(page);
  arrange?.(leaving);
};

interface LeaveState {
  before: (page: Page) => Promise<void>;
  app?: (page: Page) => Promise<void>;
}

export const leaveStates = {
  leavePopkin: { before: atHome(), app: async (page) => void (await openLeave(page)) },
} satisfies Partial<Record<RouteKey, LeaveState>>;
