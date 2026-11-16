import type { Page, Request } from '@playwright/test';
import { join } from 'node:path';
import responses from './api/responses.json';
import { answer, failNetwork, problem, recordedBody } from './stubs';

const MOCK_IMAGES = join(__dirname, '../../docs/mocks/assets/images');

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

/** The id the recording gave the contact of that name, read from their recorded profile. */
export function recordedContactId(name: string): string {
  const key = Object.keys(responses).find(
    (k) =>
      /^GET \/api\/contacts\/people\/[^/]+$/.test(k) &&
      recordedBody<{ name?: string }>(k)?.name === name,
  );
  if (!key) throw new Error(`The recording reads no contact named ${name}.`);
  return key.slice('GET /api/contacts/people/'.length);
}

/** Where the suite serves a contact's photo: the mocks' picture of Chidi. */
export const contactPhoto = '/api/files/contacts/contact-chidi.jpg';

/** Serves `contactPhoto` from the mocks, so a profile draws the picture the mock does. */
export function serveContactPhoto(page: Page): Promise<void> {
  return page.route(`**${contactPhoto}`, (route) =>
    route.fulfill({ path: join(MOCK_IMAGES, 'contact-chidi.jpg'), contentType: 'image/jpeg' }),
  );
}

/**
 * A recorded profile with what the mocks draw in place of what the recording made at random: a
 * photo the suite can serve, and the mocks' colour. `change` replaces anything else.
 */
async function profileAsDrawn(page: Page, name: string, change: object): Promise<void> {
  const key = `GET /api/contacts/people/${recordedContactId(name)}`;
  await answer(page, key, { status: 200, body: { ...recordedBody<object>(key), ...change } });
}

/** Chidi's profile, as default.html draws him: his photo, in sky. */
export async function chidiProfile(page: Page, change: object = {}): Promise<void> {
  await serveContactPhoto(page);
  await profileAsDrawn(page, 'Chidi Okafor', { photoUrl: contactPhoto, accent: 'Sky', ...change });
}

/** Femi's profile, as empty.html draws him: initials in leaf. */
export function femiProfile(page: Page, change: object = {}): Promise<void> {
  return profileAsDrawn(page, 'Femi Bankole', { accent: 'Leaf', ...change });
}
