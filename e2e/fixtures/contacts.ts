import type { Page, Request } from '@playwright/test';
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

/** The Contacts cast of the mocks: Mara keeps 13 people (docs/mocks/README.md). */
export function contactsOfMara(page: Page): Promise<void> {
  return answer(page, 'GET /api/contacts/summary', { status: 200, body: { people: 13 } });
}

/** 8:40 am on Tuesday 15 September 2026, the morning of the Contacts mocks. */
export const contactsMorning = new Date(2026, 8, 15, 8, 40);

/** The part `contact` of an Add someone or Edit request, as the JSON it holds. */
export function contactSent(request: Request): unknown {
  const body = request.postData() ?? '';
  const part = body.split(/\r?\n--/).find((p) => /name="contact"/.test(p));
  if (!part) throw new Error('The request has no part "contact".');
  return JSON.parse(part.slice(part.search(/\r?\n\r?\n/)).trim());
}
