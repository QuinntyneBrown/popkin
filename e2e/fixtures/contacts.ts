import type { Page } from '@playwright/test';
import { answer, failNetwork, problem } from './stubs';

/**
 * Contacts switched off (L2-121, ADR 0023). The recording is made with it on; this answers
 * `GET /api/contacts/summary` as a deployed Popkin does before it is on.
 */
export function contactsOff(page: Page): Promise<void> {
  return answer(page, 'GET /api/contacts/summary', problem(404, 'feature_off'));
}

/** The API cannot say whether Contacts is open: the app keeps it closed (ADR 0023). */
export function contactsUnknown(page: Page): Promise<void> {
  return failNetwork(page, 'GET /api/contacts/summary');
}
