import type { Page, Route } from '@playwright/test';
import { popkinId } from './chat';
import { type Home, maraAtHome } from './home';
import { listKey, theMockList } from './my-popkins';
import { answer, problem } from './stubs';
import { PopkinHomePage } from '../pages/popkin-home.page';
import { PopkinSettingsDialog } from '../pages/popkin-settings.dialog';
import { LeavePopkinDialog } from '../pages/leave-popkin.dialog';

/*
 * Leaving Lakeside Weekend (journey 18), answered in memory (ADR 0005). The home is the mocks'
 * one seen by a member who is not the Host; `DELETE …/members/me` answers as a spec arranges,
 * and My Popkins, once it has gone through, no longer lists Lakeside Weekend.
 */

type Answer = 'left' | 'fails' | 'host';

export class Leaving {
  /** How many times the leave was sent. */
  sent = 0;
  answer: Answer = 'left';
  private held?: Promise<void>;

  constructor(
    private readonly page: Page,
    readonly home: Home,
  ) {}

  async install(): Promise<void> {
    await this.page.route(`**/api/popkins/${popkinId}/members/me`, (route) => this.leave(route));
  }

  /** The leave does not answer until the returned function is called. */
  hold(): () => void {
    let release: () => void = () => undefined;
    this.held = new Promise((resolve) => (release = resolve));
    return release;
  }

  private async leave(route: Route): Promise<void> {
    if (route.request().method() !== 'DELETE') return route.fallback();
    this.sent++;
    await this.held;
    if (this.answer === 'fails') {
      const failed = problem(500, 'server_error');
      return route.fulfill({ status: failed.status, json: failed.body });
    }
    if (this.answer === 'host') {
      const refused = problem(403, 'host_cannot_leave');
      return route.fulfill({ status: refused.status, json: refused.body });
    }
    // Gone: the list no longer has it, and the home is a stranger's (L2-047 AC2, AC4).
    await answer(this.page, listKey, {
      status: 200,
      body: { ...theMockList, active: theMockList.active.filter((one) => one.id !== popkinId) },
    });
    this.home.fail('popkin', 'not-found');
    return route.fulfill({ status: 204 });
  }
}

/** Mara at the home of Lakeside Weekend as a member who is not the Host. */
export async function aMemberAtHome(page: Page, change?: (home: Home) => void): Promise<Leaving> {
  const home = await maraAtHome(page, (home) => {
    home.popkin = { ...home.popkin, viewerRole: 'Member' };
    change?.(home);
  });
  const leaving = new Leaving(page, home);
  await leaving.install();
  return leaving;
}

/** From the home: Popkin settings, then "Leave this Popkin". */
export async function openLeave(page: Page): Promise<LeavePopkinDialog> {
  await new PopkinHomePage(page).settings.click();
  await new PopkinSettingsDialog(page).leave.click();
  const dialog = new LeavePopkinDialog(page);
  await dialog.heading.waitFor();
  return dialog;
}
