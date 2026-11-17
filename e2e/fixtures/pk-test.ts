import { test as base, expect, type Page } from '@playwright/test';
import responses from './api/responses.json';
import { serveRecordedPhotos } from './contacts';
import { Hub } from './hub';
import { routes, type RouteKey, type ScreenRoute } from './routes';

/** True when the target is the mocks: the sweeps' baseline render, or the parity specs' one. */
export const BASELINE = process.env['PK_BASELINE'] === '1' || process.env['PK_PARITY'] === 'mocks';

/** A recorded answer, keyed in responses.json by "METHOD /api/path?query". */
interface RecordedResponse {
  status: number;
  body?: unknown;
}

const recorded: Record<string, RecordedResponse> = responses;

/** A Popkin's header, `GET /api/popkins/{id}`, and the switches its screens read every minute. */
const header = /^GET \/api\/popkins\/[0-9a-f-]{36}(\/features)?$/;

/** What a Popkin not yet created is offered, `GET /api/popkins/features` (L2-152 AC8). */
const offered = 'GET /api/popkins/features';

/**
 * The recording is made with Schedules and Plan on (`popkin seed`, run by eng/Start-E2eApi.ps1). The screens of the
 * earlier journeys stand for a Popkin where they are off, as their mocks do (docs/mocks/README.md,
 * 8), so the recorded header is read with both off and nothing offered, and a new Popkin is
 * offered neither; a spec of Schedules, Plan or choosing them answers these itself.
 */
function featuresOff(key: string, body: unknown): unknown {
  if (key === offered) return { offered: [] };
  if (!header.test(key) || !body || typeof body !== 'object') return body;
  return key.endsWith('/features')
    ? { ...body, schedules: false, plan: false, choices: [] }
    : { ...body, schedules: false, plan: false };
}

/** Opens screens by route key against the app, or against the mocks when PK_BASELINE=1. */
export class Pk {
  constructor(private readonly page: Page) {}

  async open(key: RouteKey): Promise<void> {
    const route: ScreenRoute = routes[key];
    if (BASELINE) {
      if (!route.mock) throw new Error(`Screen "${key}" has no mock yet.`);
      // ?chrome=0 hides the mock bar and the notes, leaving what the product shows.
      await this.page.goto(`${route.mock}${route.mock.includes('?') ? '&' : '?'}chrome=0`);
      return;
    }
    await this.page.goto(route.app);
  }
}

/**
 * ADR 0005: no test reaches the API. Every /api request is answered from the recording, and a
 * request without an answer fails the test that made it. ADR 0010: the same holds for the hub
 * under /hubs, which `hub` stubs for every page.
 */
export const test = base.extend<{ pk: Pk; unanswered: string[]; hub: Hub }>({
  unanswered: async ({}, use) => {
    const requests: string[] = [];
    await use(requests);
    expect(requests, 'API and hub requests with no answer').toEqual([]);
  },
  hub: async ({}, use) => {
    await use(new Hub());
  },
  page: async ({ page, unanswered, hub }, use) => {
    await hub.install(page, unanswered);
    await page.route('**/api/**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const key = `${request.method()} ${url.pathname}${url.search}`;
      const answer = recorded[key];
      if (!answer) {
        unanswered.push(key);
        await route.abort();
        return;
      }
      await route.fulfill({ status: answer.status, json: featuresOff(key, answer.body) });
    });
    // A contact's photo the recording made is a signed address no recording answers: any screen
    // that lists contacts may draw one, so each is the mocks' picture, unless a test serves its own.
    await serveRecordedPhotos(page);
    await use(page);
  },
  pk: async ({ page }, use) => {
    await use(new Pk(page));
  },
});

export { expect };
