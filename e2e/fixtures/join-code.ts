import type { Page } from '@playwright/test';
import { asVisitor, inviteCode, previewKey } from './journeys';
import { answer, problem } from './stubs';

/**
 * Join with a code (L2-015 AC5, AC6, L2-053): a visitor at `/join`, with the invite lookup
 * answered from the recording, or held, refused or failing as a spec needs (ADR 0005).
 */
export const joinCodeUrl = '/join';

/** A code in the invite alphabet that matches no Popkin. */
export const unknownCode = 'k7qm3xp9';

/** A visitor at Join with a code; the recorded invite answers its own code. */
export async function aVisitorWithACode(page: Page): Promise<void> {
  await asVisitor(page);
  await answer(page, `GET /api/invites/${unknownCode}`, problem(404, 'invite_not_found'));
}

/** The lookup of the recorded invite waits until the returned function is called. */
export async function holdTheLookup(page: Page): Promise<() => void> {
  let release: () => void = () => undefined;
  const held = new Promise<void>((resolve) => (release = resolve));
  let first = true;
  await page.route(`**/api/invites/${inviteCode}`, async (route) => {
    if (first) {
      first = false;
      await held;
    }
    await route.fallback();
  });
  return release;
}

/** Too many codes tried from this address: every lookup is refused for `seconds`. */
export async function tooManyTries(page: Page, seconds = 540): Promise<void> {
  await answer(page, previewKey, problem(429, 'rate_limited', { retryAfterSeconds: seconds }));
}

/** The lookup fails on the server. */
export async function theLookupFails(page: Page): Promise<void> {
  await answer(page, previewKey, problem(500, 'server_error'));
}
