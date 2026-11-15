import { type Page, type Route, expect } from '@playwright/test';
import { PopkinHomePage } from '../pages/popkin-home.page';
import { PopkinSettingsDialog } from '../pages/popkin-settings.dialog';
import { SetEventDialog } from '../pages/set-event.dialog';
import { popkinId } from './chat';
import { homeOf } from './home';
import { type Schedule, maraWithASchedule, scheduleOf } from './schedule';
import { problem } from './stubs';

export interface EventBody {
  label: string;
  firstDay: string;
  lastDay: string;
}

/** Lake weekend, the event of the Set the event mocks, in Cabin Week ’27's time. */
export const lakeWeekend: EventBody = {
  label: 'Lake weekend',
  firstDay: '2027-03-05',
  lastDay: '2027-03-07',
};

/**
 * The event (L2-085) answered in memory (ADR 0005): `PUT` and `DELETE /api/popkins/{id}/event`
 * change the header's event and the Schedule's, as the API does, and refuse a member who is not
 * the Host. A spec can fail or hold the call.
 */
export class EventSettings {
  /** The bodies sent, in order; null for a removal. */
  readonly sent: (EventBody | null)[] = [];
  private failing = false;
  private held: Promise<void> | undefined;

  constructor(
    private readonly page: Page,
    readonly schedule: Schedule,
  ) {}

  async install(): Promise<void> {
    await this.page.route(`**/api/popkins/${popkinId}/event`, (route) => this.answer(route));
  }

  fail(): void {
    this.failing = true;
  }

  /** The call does not answer until the returned function is called. */
  hold(): () => void {
    let release: () => void = () => undefined;
    this.held = new Promise((resolve) => (release = resolve));
    return release;
  }

  private async answer(route: Route): Promise<void> {
    const remove = route.request().method() === 'DELETE';
    const body = remove ? null : (route.request().postDataJSON() as EventBody);
    this.sent.push(body);
    await this.held;
    const home = homeOf(this.page);
    if (home.popkin.viewerRole !== 'Host') return this.refuse(route, 403, 'host_only');
    if (this.failing) return this.refuse(route, 500, 'server_error');
    home.popkin.event = body;
    this.schedule.event = body;
    return remove ? route.fulfill({ status: 204 }) : route.fulfill({ json: body });
  }

  private refuse(route: Route, status: number, code: string): Promise<void> {
    const answer = problem(status, code);
    return route.fulfill({ status: answer.status, json: answer.body });
  }
}

/**
 * Mara in Cabin Week ’27 with Schedules on, its event `event`, as the Host unless `role` says
 * otherwise, with the event answering.
 */
export async function maraWithAnEvent(
  page: Page,
  event: EventBody | null = lakeWeekend,
  role: 'Host' | 'Member' = 'Host',
): Promise<EventSettings> {
  await maraWithASchedule(page, (schedule, home) => {
    schedule.event = event;
    home.popkin.event = event;
    home.popkin.viewerRole = role;
  });
  const settings = new EventSettings(page, scheduleOf(page));
  await settings.install();
  return settings;
}

/** Opens "Set the event" from Popkin settings on the home. */
export async function openSetEvent(page: Page): Promise<SetEventDialog> {
  await new PopkinHomePage(page).settings.click();
  await new PopkinSettingsDialog(page).setEvent.click();
  const dialog = new SetEventDialog(page);
  await expect(dialog.heading).toBeVisible();
  return dialog;
}
