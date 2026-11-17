import type { Page } from '@playwright/test';
import { answer, problem } from './stubs';

/**
 * The unsubscribe link of an email (L2-168). Only the Worker issues a token the API reads, so
 * the recording holds the refused link alone; a link that works is stubbed.
 */
export const EXPIRED_LINK = 'an-expired-link';
export const WORKING_LINK = 'a-working-link';

const unsubscribe = (token: string) => `POST /api/notifications/unsubscribe?t=${token}`;

/** The link turns email off, as the API answers a token it can read. */
export async function theLinkWorks(page: Page): Promise<void> {
  await answer(page, unsubscribe(WORKING_LINK), { status: 200, body: { unsubscribed: true } });
}

/** The link fails as a server error does, with nothing changed; the next try works. */
export async function theLinkFailsOnce(page: Page): Promise<void> {
  await theLinkWorks(page);
  let failed = false;
  await page.route('**/api/notifications/unsubscribe**', async (route) => {
    if (failed) return route.fallback();
    failed = true;
    const refused = problem(500, 'unexpected');
    await route.fulfill({ status: refused.status, json: refused.body, headers: refused.headers });
  });
}

/** The page's request is held in flight, so the working state can be seen. */
export async function theLinkIsSlow(page: Page): Promise<() => void> {
  let release: () => void = () => undefined;
  const released = new Promise<void>((resolve) => (release = resolve));
  await page.route('**/api/notifications/unsubscribe**', async (route) => {
    await released;
    await route.fulfill({ status: 200, json: { unsubscribed: true } });
  });
  return release;
}
