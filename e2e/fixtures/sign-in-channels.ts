import type { Page } from '@playwright/test';
import { answer, failNetwork } from './stubs';

/**
 * Phone sign-in switched off (L2-084). The recording is made with it on, so it offers "Phone"
 * and "Email"; these answer `GET /api/auth/channels` as a deployed Popkin does before it is on.
 */
export function phoneSignInOff(page: Page): Promise<void> {
  return answer(page, 'GET /api/auth/channels', { status: 200, body: { channels: ['Email'] } });
}

/** The API cannot say which ways are offered (L2-084 AC6). */
export function channelsUnknown(page: Page): Promise<void> {
  return failNetwork(page, 'GET /api/auth/channels');
}
