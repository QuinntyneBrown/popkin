import { test as base, expect, type Page } from '@playwright/test';
import responses from './api/responses.json';
import { routes, type RouteKey, type ScreenRoute } from './routes';

/** True when the target is the mocks: the sweeps' baseline render, or the parity specs' one. */
export const BASELINE = process.env['PK_BASELINE'] === '1' || process.env['PK_PARITY'] === 'mocks';

/** A recorded answer, keyed in responses.json by "METHOD /api/path?query". */
interface RecordedResponse {
  status: number;
  body?: unknown;
}

const recorded: Record<string, RecordedResponse> = responses;

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
 * request without an answer fails the test that made it.
 */
export const test = base.extend<{ pk: Pk; unanswered: string[] }>({
  unanswered: async ({}, use) => {
    const requests: string[] = [];
    await use(requests);
    expect(requests, 'API requests with no recorded answer').toEqual([]);
  },
  page: async ({ page, unanswered }, use) => {
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
      await route.fulfill({ status: answer.status, json: answer.body });
    });
    await use(page);
  },
  pk: async ({ page }, use) => {
    await use(new Pk(page));
  },
});

export { expect };
