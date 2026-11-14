import { expect, type Page } from '@playwright/test';
import { JoinCodePage } from '../pages/join-code.page';
import { asVisitor, inviteCode } from './journeys';
import type { RouteKey } from './routes';
import { answer, problem } from './stubs';

/**
 * Join with a code (L2-015 AC5, AC6, L2-053): a visitor at `/join`, with the invite lookup
 * answered from the recording, or held, refused or failing as a spec needs (ADR 0005).
 */
export const joinCodeUrl = '/join';

/** A code in the invite alphabet that matches no Popkin. */
export const unknownCode = 'k7qm3xp9';

/** The code the mocks draw in the field; its lookup is held, refused or failing as a state needs. */
export const typedCode = 'kx7m2pqr9t';

/** A visitor at Join with a code; the recorded invite answers its own code. */
export async function aVisitorWithACode(page: Page): Promise<void> {
  await asVisitor(page);
  await answer(page, `GET /api/invites/${unknownCode}`, problem(404, 'invite_not_found'));
}

/** The lookup of `code` waits until the returned function is called. */
export async function holdTheLookup(page: Page, code = inviteCode): Promise<() => void> {
  let release: () => void = () => undefined;
  const held = new Promise<void>((resolve) => (release = resolve));
  let first = true;
  await page.route(`**/api/invites/${code}`, async (route) => {
    if (first) {
      first = false;
      await held;
    }
    await route.fallback();
  });
  return release;
}

/** Too many codes tried from this address: the lookup of `code` is refused for `seconds`. */
export async function tooManyTries(page: Page, seconds = 540, code = inviteCode): Promise<void> {
  const refusal = problem(429, 'rate_limited', { retryAfterSeconds: seconds });
  await answer(page, `GET /api/invites/${code}`, refusal);
}

/** The lookup of `code` fails on the server. */
export async function theLookupFails(page: Page, code = inviteCode): Promise<void> {
  await answer(page, `GET /api/invites/${code}`, problem(500, 'server_error'));
}

interface JoinCodeScreenState {
  before: (page: Page) => Promise<void>;
  app?: (page: Page) => Promise<void>;
}

/** Types `text` and chooses "Find my Popkin". */
async function tries(page: Page, text: string): Promise<JoinCodePage> {
  const join = new JoinCodePage(page);
  await join.code.fill(text);
  await join.find.click();
  return join;
}

/**
 * The states of Join with a code the mocks draw, for the sweeps and the parity specs: `before`
 * is the step before the page opens, `app` what brings the open page to the state.
 */
export const joinCodeStates = {
  joinCode: { before: aVisitorWithACode },
  joinCodeSubmitting: {
    before: async (page) => {
      await aVisitorWithACode(page);
      await holdTheLookup(page, typedCode);
    },
    app: async (page) => {
      const join = await tries(page, typedCode);
      await expect(join.find).toBeDisabled();
    },
  },
  joinCodeInvalid: {
    before: aVisitorWithACode,
    app: async (page) => void (await (await tries(page, 'lakesid3')).error.waitFor()),
  },
  joinCodeBlank: {
    before: aVisitorWithACode,
    app: async (page) => void (await (await tries(page, '')).error.waitFor()),
  },
  joinCodeError: {
    before: async (page) => {
      await aVisitorWithACode(page);
      await theLookupFails(page, typedCode);
    },
    app: async (page) => void (await (await tries(page, typedCode)).alert.waitFor()),
  },
  joinCodeLimited: {
    before: async (page) => {
      await aVisitorWithACode(page);
      await tooManyTries(page, 540, typedCode);
    },
    app: async (page) => void (await (await tries(page, typedCode)).alert.waitFor()),
  },
} satisfies Partial<Record<RouteKey, JoinCodeScreenState>>;
