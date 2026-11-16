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

/** Serves a picture from the mocks at `/api/files/contacts/{file}`, as a contact's photo. */
export function servePhotos(page: Page): Promise<void> {
  return page.route('**/api/files/contacts/*.jpg', (route) =>
    route.fulfill({
      path: join(MOCK_IMAGES, new URL(route.request().url()).pathname.split('/').pop() ?? ''),
      contentType: 'image/jpeg',
    }),
  );
}

/** People on the morning of the mocks, as the API reads it for `contactsMorning`. */
export const peopleKey = 'GET /api/contacts/people?on=2026-09-15';

type Row = [
  name: string,
  knownAs: string,
  circle: string,
  accent: string,
  photo: string | null,
  next: [month: number, day: number, title: string, inDays: number],
  lastTalkedOn: string,
  lastTalkedDays: number,
  closest?: boolean,
];

/** Mara's 13 people as contacts-people/default.html draws them on 15 September 2026. */
const MARAS_PEOPLE: Row[] = [
  [
    'Ada Okafor',
    'Mum',
    'Family',
    'Coral',
    'contact-ada.jpg',
    [10, 7, 'Birthday', 22],
    '2026-09-13',
    2,
    true,
  ],
  [
    'Ben Hale',
    'Uni friend',
    'Friends',
    'Amber',
    null,
    [10, 5, 'Iris is one month old', 20],
    '2026-09-05',
    10,
  ],
  [
    'Chidi Okafor',
    'Brother',
    'Family',
    'Sky',
    'contact-chidi.jpg',
    [9, 26, 'Anniversary', 11],
    '2026-09-06',
    9,
    true,
  ],
  [
    'Dev Patel',
    'Colleague, design team',
    'Work',
    'Sky',
    'call3.jpg',
    [11, 2, '5 years at the studio', 48],
    '2026-09-14',
    1,
  ],
  [
    'Ellie Brennan',
    'Thursday group',
    'Clubs',
    'Berry',
    'call4.jpg',
    [4, 29, 'Birthday', 226],
    '2026-09-10',
    5,
  ],
  [
    'Grace Adeyemi',
    'Best friend from uni',
    'Friends',
    'Plum',
    'contact-grace.jpg',
    [9, 19, 'Birthday', 4],
    '2026-09-11',
    4,
    true,
  ],
  ['Ifeoma Okafor', 'Sister', 'Family', 'Berry', null, [12, 9, 'Birthday', 85], '2026-09-04', 11],
  ['Joel Kim', 'Thursday group', 'Clubs', 'Sky', null, [7, 23, 'Birthday', 311], '2026-08-13', 33],
  [
    'Priya Nair',
    'Tigers U9 parent',
    'Clubs',
    'Coral',
    null,
    [8, 7, 'Birthday', 326],
    '2026-09-12',
    3,
  ],
  [
    'Ruth Lindqvist',
    'Next door, no. 14',
    'Neighbours',
    'Teal',
    'contact-ruth.jpg',
    [10, 24, 'Birthday', 39],
    '2026-09-12',
    3,
  ],
  [
    'Sam Ortega',
    'Former manager',
    'Work',
    'Amber',
    null,
    [3, 11, 'Birthday', 177],
    '2026-07-18',
    59,
  ],
  [
    'Tomás Reyes',
    'Brother-in-law',
    'Family',
    'Leaf',
    null,
    [9, 26, 'Anniversary', 11],
    '2026-09-06',
    9,
  ],
  [
    'Walt Brennan',
    'Thursday group',
    'Clubs',
    'Leaf',
    'call2.jpg',
    [11, 16, 'Birthday', 62],
    '2026-09-10',
    5,
  ],
];

/**
 * Mara's 13 people, in the shape the recording reads a row in: what key dates and the log will
 * give each one, which the recording cannot make yet (L2-126).
 */
export async function marasPeople(page: Page): Promise<void> {
  const recorded = recordedBody<{ contacts: object[] }>(peopleKey).contacts[0];
  await servePhotos(page);
  await answer(page, peopleKey, {
    status: 200,
    body: {
      contacts: MARAS_PEOPLE.map(
        (
          [name, knownAs, circle, accent, photo, next, lastTalkedOn, lastTalkedDays, closest],
          i,
        ) => ({
          ...recorded,
          id: `00000000-0000-4000-d000-${String(i + 1).padStart(12, '0')}`,
          name,
          firstName: name.split(' ')[0],
          knownAs,
          circle,
          isClosest: closest ?? false,
          photoUrl: photo ? `/api/files/contacts/${photo}` : null,
          initials: name
            .split(' ')
            .map((part) => part[0])
            .join(''),
          accent,
          nextDate: {
            month: next[0],
            day: next[1],
            kind: 'Birthday',
            title: next[2],
            inDays: next[3],
          },
          lastTalkedOn,
          lastTalkedDays,
        }),
      ),
    },
  });
  await contactsOfMara(page);
}

/** The photos the recording made: each is the mocks' picture of Chidi. */
export function serveRecordedPhotos(page: Page): Promise<void> {
  return page.route('**/api/files/contacts/*.jpg?*', (route) =>
    route.fulfill({ path: join(MOCK_IMAGES, 'contact-chidi.jpg'), contentType: 'image/jpeg' }),
  );
}

/** Nobody in Contacts yet (L2-126 AC4). */
export async function nobodyInPeople(page: Page): Promise<void> {
  await answer(page, peopleKey, { status: 200, body: { contacts: [] } });
  await answer(page, 'GET /api/contacts/summary', { status: 200, body: { people: 0 } });
}
