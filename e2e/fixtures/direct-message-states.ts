import type { Page } from '@playwright/test';
import type { RouteKey } from './routes';

/*
 * The states of journey 11, Direct message, the mocks draw, for the sweeps and the parity
 * specs: `before` is the step before the page opens (the answers of the API and the hub),
 * `app` what brings the open page to the state (opening New message, typing "Zz").
 *
 * TO FILL (the stores and pages of journey 11): every `before` is a no-op until the pages
 * exist, so the parity specs that spread these states cannot pass yet.
 */

interface DirectMessageState {
  before: (page: Page) => Promise<void>;
  app?: (page: Page) => Promise<void>;
}

const notYet = async (): Promise<void> => undefined;

export const directMessageStates = {
  conversations: { before: notYet },
  conversationsLoading: { before: notYet },
  conversationsEmpty: { before: notYet },
  conversationsError: { before: notYet },
  newMessage: { before: notYet },
  newMessageNoResults: { before: notYet },
  directMessage: { before: notYet },
  directMessageLoading: { before: notYet },
  directMessageEmpty: { before: notYet },
  directMessageError: { before: notYet },
  directMessageReadOnly: { before: notYet },
  directMessageCall: { before: notYet },
} satisfies Partial<Record<RouteKey, DirectMessageState>>;
