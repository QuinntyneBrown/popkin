import type { Page } from '@playwright/test';
import responses from './api/responses.json';
import { servePhotos } from './contacts';
import { answer } from './stubs';

export const connectionsKey = 'GET /api/contacts/connections';
export const sessionKey = 'GET /api/auth/session';

/** [name, accent, photo, circle, known as] in the order the mocks place the faces. */
type Face = [string, string, string | null, string | null, string | null];

/** Mara's map as the Connections mocks draw it, each face where the layout rule puts it. */
const FACES: Face[] = [
  ['Ada Okafor', 'Coral', 'contact-ada.jpg', 'Family', null],
  ['Ifeoma Okafor', 'Berry', null, 'Family', null],
  ['Chidi Okafor', 'Sky', 'contact-chidi.jpg', 'Family', 'Brother'],
  ['Tomás Reyes', 'Leaf', null, null, null],
  ['Grace Adeyemi', 'Plum', 'contact-grace.jpg', 'Friends', null],
  ['Ben Hale', 'Amber', null, 'Friends', null],
  ['Ruth Lindqvist', 'Teal', 'contact-ruth.jpg', 'Friends', null],
  ['Walt Brennan', 'Leaf', 'call2.jpg', 'Friends', null],
  ['Ellie Brennan', 'Berry', 'call4.jpg', null, null],
  ['Dev Patel', 'Sky', 'call3.jpg', 'Work', null],
  ['Sam Ortega', 'Amber', null, null, null],
  ['Priya Nair', 'Coral', null, 'Friends', null],
];

/** [one, other, kind, words, promised], in the order they were made. */
type Line = [string, string, string, string | null, boolean];

const LINES: Line[] = [
  ['Ada Okafor', 'Ifeoma Okafor', 'Family', null, false],
  ['Chidi Okafor', 'Tomás Reyes', 'Partner', 'Married', false],
  ['Grace Adeyemi', 'Ben Hale', 'Friend', null, false],
  ['Ruth Lindqvist', 'Ada Okafor', 'Friend', null, false],
  ['Walt Brennan', 'Ellie Brennan', 'Family', null, false],
  ['Walt Brennan', 'Ruth Lindqvist', 'Friend', null, false],
  ['Dev Patel', 'Sam Ortega', 'Work', null, false],
  ['Dev Patel', 'Priya Nair', 'Work', null, true],
];

/** The id of a face on the map, by name. */
export function faceId(name: string): string {
  const n = FACES.findIndex(([face]) => face === name) + 1;
  return `00000000-0000-4000-d000-${String(n).padStart(12, '0')}`;
}

function personOf([name, accent, photo, circle, knownAs]: Face): object {
  return {
    contactId: faceId(name),
    firstName: name.split(' ')[0],
    fullName: name,
    initials: name
      .split(' ')
      .map((part) => part[0])
      .join(''),
    accent,
    photoUrl: photo ? `/api/files/contacts/${photo}` : null,
    knownAs,
    circle,
  };
}

/** The map's body as drawn. */
export function connectionsAsDrawn(): { people: object[]; connections: object[] } {
  return {
    people: FACES.map(personOf),
    connections: LINES.map(([one, other, kind, words, promised], i) => ({
      id: `00000000-0000-4000-d100-${String(i + 1).padStart(12, '0')}`,
      contactId: faceId(one),
      otherContactId: faceId(other),
      kind,
      words,
      promised,
    })),
  };
}

/** Connections answers with the mocks' map, and Mara is herself in the middle. */
export async function marasConnections(page: Page): Promise<void> {
  await servePhotos(page);
  await answer(page, sessionKey, {
    status: 200,
    body: { ...responses[sessionKey].body, photoUrl: '/api/files/contacts/call1.jpg' },
  });
  await answer(page, connectionsKey, { status: 200, body: connectionsAsDrawn() });
}

/** No connections yet. */
export function noConnections(page: Page): Promise<void> {
  return answer(page, connectionsKey, { status: 200, body: { people: [], connections: [] } });
}

/** People, as Connect's "Who" reads them: the faces of the map, A to Z, as the mocks list them. */
export function peopleOfTheMap(): object {
  const recorded = responses['GET /api/contacts/people?on=2026-09-15'].body;
  return {
    ...recorded,
    contacts: FACES.map(([name, accent, photo, circle, knownAs]) => ({
      id: faceId(name),
      name,
      firstName: name.split(' ')[0],
      knownAs,
      circle,
      isClosest: false,
      photoUrl: photo ? `/api/files/contacts/${photo}` : null,
      initials: name
        .split(' ')
        .map((part) => part[0])
        .join(''),
      accent,
      nextDate: null,
      lastTalkedOn: null,
      lastTalkedDays: null,
    })).sort((a, b) => a.name.localeCompare(b.name)),
  };
}
