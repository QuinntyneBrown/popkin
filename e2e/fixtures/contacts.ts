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

/** Chidi's profile, as default.html draws him: his photo, in sky, and his timeline's photo. */
export async function chidiProfile(page: Page, change: object = {}): Promise<void> {
  await serveContactPhoto(page);
  await serveMemoryPhotos(page);
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

/** Dates on the morning of the mocks (L2-137). */
export const datesKey = 'GET /api/contacts/dates?on=2026-09-15&kind=all';
export const birthdaysKey = 'GET /api/contacts/dates?on=2026-09-15&kind=birthdays';

type DateRow = [
  first: string,
  accent: string,
  photo: string | null,
  kind: string,
  title: string | null,
  occursOn: string,
  daysLeft: number,
  years: number | null,
  lead: string,
];

/** Mara's key dates as contacts-dates/default.html draws them on 15 September 2026. */
const MARAS_DATES: DateRow[] = [
  ['Grace', 'Plum', 'contact-grace.jpg', 'Birthday', null, '2026-09-19', 4, 33, 'OneWeekBefore'],
  [
    'Chidi',
    'Sky',
    'contact-chidi.jpg',
    'Anniversary',
    null,
    '2026-09-26',
    11,
    5,
    'ThreeDaysBefore',
  ],
  ['Ben', 'Amber', null, 'Other', 'Iris is one month old', '2026-10-05', 20, null, 'OnTheDay'],
  ['Ada', 'Coral', 'contact-ada.jpg', 'Birthday', null, '2026-10-07', 22, 64, 'TwoWeeksBefore'],
  ['Ruth', 'Teal', 'contact-ruth.jpg', 'Birthday', null, '2026-10-24', 39, 78, 'OneWeekBefore'],
  [
    'Dev',
    'Sky',
    'call3.jpg',
    'Milestone',
    'Dev’s 5 years at the studio',
    '2026-11-02',
    48,
    null,
    'OneDayBefore',
  ],
  ['Walt', 'Leaf', 'call2.jpg', 'Birthday', null, '2026-11-16', 62, 71, 'OneWeekBefore'],
  ['Ifeoma', 'Berry', null, 'Birthday', null, '2026-12-09', 85, 29, 'OneWeekBefore'],
  [
    'Grace',
    'Plum',
    'contact-grace.jpg',
    'Other',
    'Grace & Femi’s wedding',
    '2026-12-26',
    102,
    null,
    'OneMonthBefore',
  ],
];

/** Mara's dates, in the shape the recording reads a date in; `kind` narrows them as the API does. */
export async function marasDates(page: Page, kind: 'all' | 'birthdays' = 'all'): Promise<void> {
  type Recorded = { dates: object[]; preferences: object };
  const recorded = recordedBody<Recorded>(datesKey);
  await servePhotos(page);
  const dates = MARAS_DATES.filter((d) => kind === 'all' || d[3] === 'Birthday').map(
    ([first, accent, photo, k, title, occursOn, daysLeft, years, lead], i) => ({
      ...recorded.dates[0],
      id: `00000000-0000-4000-e000-${String(i + 1).padStart(12, '0')}`,
      contactId: recordedContactId('Chidi Okafor'),
      firstName: first,
      photoUrl: photo ? `/api/files/contacts/${photo}` : null,
      initials: first.slice(0, 2).toUpperCase(),
      accent,
      kind: k,
      title,
      occursOn,
      daysLeft,
      years,
      lead,
    }),
  );
  await answer(page, kind === 'all' ? datesKey : birthdaysKey, {
    status: 200,
    body: {
      dates,
      preferences: {
        birthdayLead: 'OneWeekBefore',
        anniversaryLead: 'ThreeDaysBefore',
        milestoneLead: 'OnTheDay',
        phoneNotifications: true,
        mondayEmail: true,
      },
    },
  });
  await contactsOfMara(page);
}

/** No key dates yet (L2-137 AC4). */
export async function noDates(page: Page): Promise<void> {
  const recorded = recordedBody<{ preferences: object }>(datesKey);
  await answer(page, datesKey, {
    status: 200,
    body: { dates: [], preferences: recorded.preferences },
  });
  await contactsOfMara(page);
}

export const followUpsKey = 'GET /api/contacts/follow-ups';

/** [text, first name, accent, photo, due, promised via, promised on, done on] */
type FollowUpRow = [
  string,
  string | null,
  string | null,
  string | null,
  string | null,
  string | null,
  string | null,
  string | null,
];

/** Mara's follow-ups as the mocks draw them on Tuesday 15 September 2026. */
const MARAS_FOLLOW_UPS: FollowUpRow[] = [
  [
    'Introduce Dev to Priya about the design role',
    'Dev',
    'Sky',
    'call3.jpg',
    '2026-09-13',
    'Messages',
    '2026-09-03',
    null,
  ],
  [
    'Return Ruth’s ladder',
    'Ruth',
    'Teal',
    'contact-ruth.jpg',
    '2026-09-15',
    'InPerson',
    '2026-09-12',
    null,
  ],
  [
    'Send Grace the Lisbon photos',
    'Grace',
    'Plum',
    'contact-grace.jpg',
    '2026-09-17',
    'Video',
    '2026-09-11',
    null,
  ],
  [
    'Pick up her birthday card and a bottle of orange wine',
    'Grace',
    'Plum',
    'contact-grace.jpg',
    '2026-09-18',
    null,
    null,
    null,
  ],
  [
    'Drop a lasagne round for Ben & Kate',
    'Ben',
    'Amber',
    null,
    '2026-09-19',
    'Messages',
    '2026-09-05',
    null,
  ],
  [
    'Ask Chidi how the commute is going',
    'Chidi',
    'Sky',
    'contact-chidi.jpg',
    '2026-09-20',
    null,
    null,
    null,
  ],
  [
    'Book a table for Ada’s birthday lunch · 7 people',
    'Ada',
    'Coral',
    'contact-ada.jpg',
    '2026-09-25',
    'Phone',
    '2026-09-13',
    null,
  ],
  [
    'Go with Mum to her knee appointment',
    'Ada',
    'Coral',
    'contact-ada.jpg',
    '2026-09-29',
    'InPerson',
    '2026-07-26',
    null,
  ],
  [
    'Bring the soup pot back on Thursday',
    'Ada',
    'Coral',
    'contact-ada.jpg',
    '2026-09-10',
    'InPerson',
    '2026-09-06',
    '2026-09-10T15:00:00Z',
  ],
];

/** The id of Mara's follow-up drawn n-th (from 1). */
export function followUpId(n: number): string {
  return `00000000-0000-4000-f000-${String(n).padStart(12, '0')}`;
}

/** Follow-ups answers with the mocks' list, linked to Chidi, the contact recorded. */
export async function marasFollowUps(page: Page): Promise<void> {
  await servePhotos(page);
  const body = MARAS_FOLLOW_UPS.map(([text, first, accent, photo, dueOn, via, on, done], i) => ({
    id: followUpId(i + 1),
    text,
    contactId: first ? recordedContactId('Chidi Okafor') : null,
    contactFirstName: first,
    contactInitials: first ? (first === 'Ben' ? 'BH' : first.slice(0, 2).toUpperCase()) : null,
    contactAccent: accent,
    contactPhotoUrl: photo ? `/api/files/contacts/${photo}` : null,
    dueOn,
    isPromise: via !== null,
    promisedVia: via,
    promisedOn: on,
    createdAt: `2026-09-0${(i % 9) + 1}T08:00:00Z`,
    doneAt: done,
  }));
  await answer(page, followUpsKey, { status: 200, body });
}

/** Nothing open, nothing done. */
export function noFollowUps(page: Page): Promise<void> {
  return answer(page, followUpsKey, { status: 200, body: [] });
}

/**
 * Answers every "Mark done" and "Mark not done" of the mocks' follow-ups with that follow-up,
 * done or open as asked, so a tick and its Undo both save.
 */
export async function answerTicks(page: Page): Promise<void> {
  await page.route('**/api/contacts/follow-ups/*/done', async (route) => {
    const id = route.request().url().split('/').at(-2) ?? '';
    const n = Number(id.slice(-12));
    const [text] = MARAS_FOLLOW_UPS[n - 1];
    const { done } = route.request().postDataJSON() as { done: boolean };
    await route.fulfill({
      json: { id, text, doneAt: done ? '2026-09-15T07:40:00Z' : null },
    });
  });
}

/** Serves every photo the recording kept as a memory: each is the mocks' hot sauce night. */
export function serveMemoryPhotos(page: Page): Promise<void> {
  return page.route('**/api/files/memories/**', (route) =>
    route.fulfill({ path: join(MOCK_IMAGES, 'tacos.jpg'), contentType: 'image/jpeg' }),
  );
}

export const chidisMemoriesKey = (): string =>
  `GET /api/contacts/people/${recordedContactId('Chidi Okafor')}/memories`;

/**
 * Chidi's memories as memories.html draws them on Tuesday 15 September 2026 (L2-136 AC1): four
 * photos, two files and a note, each newest first. The photos are the mocks' pictures.
 */
export async function chidisMemories(page: Page): Promise<void> {
  await servePhotos(page);
  const photo = (id: string, caption: string, day: string, file: string) => ({
    id,
    caption,
    day,
    thumbnailUrl: `/api/files/contacts/${file}`,
    photoUrl: `/api/files/contacts/${file}`,
  });
  await answer(page, chidisMemoriesKey(), {
    status: 200,
    body: {
      photos: [
        photo('m1', 'Hot sauce night', '2026-08-08', 'tacos.jpg'),
        photo('m2', 'Ridge trail', '2026-07-19', 'hike.jpg'),
        photo('m3', 'Lakeside, the dock', '2026-07-18', 'lake.jpg'),
        photo('m4', 'Wedding day bonfire', '2021-09-26', 'bonfire.jpg'),
      ],
      files: [
        {
          id: 'f1',
          fileName: 'Dad’s recipe for egusi.jpg',
          addedOn: '2022-12-24',
          sizeBytes: Math.round(2.1 * 1024 * 1024),
          downloadUrl: '/api/files/memories/recipe.jpg?download=1',
        },
        {
          id: 'f2',
          fileName: 'Wedding speech.pdf',
          addedOn: '2021-09-20',
          sizeBytes: 84 * 1024,
          downloadUrl: '/api/files/memories/speech.pdf?download=1',
        },
      ],
      notes: [
        {
          id: 'n1',
          text: 'Gift ideas: Fela reissue on vinyl, Dishoom cookbook, bike lights',
          updatedOn: '2026-08-31',
        },
      ],
    },
  });
}
