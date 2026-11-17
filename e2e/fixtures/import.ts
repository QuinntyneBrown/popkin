import type { Page } from '@playwright/test';
import { servePhotos } from './contacts';
import { answer } from './stubs';

/** Import's read and write (L2-151). */
export const importKey = 'GET /api/contacts/import';
export const importPostKey = 'POST /api/contacts/import';

/** [accent, photo] of each person the Import mocks list. */
const FACES: Record<string, [string, string | null]> = {
  'Amir Haddad': ['Sky', null],
  'Bea Collins': ['Berry', null],
  'Dev Patel': ['Sky', 'call3.jpg'],
  'Ellie Brennan': ['Berry', 'call4.jpg'],
  'Grace Adeyemi': ['Plum', 'contact-grace.jpg'],
  'Joel Kim': ['Sky', null],
  'Priya Nair': ['Coral', null],
  'Ruth Lindqvist': ['Teal', 'contact-ruth.jpg'],
  'Sam Ortega': ['Amber', null],
  'Walt Brennan': ['Leaf', 'call2.jpg'],
};

/** Those behind "Show {n} more": after the first four of each Popkin, A to Z. */
const LATER = [
  'Wendy Adler',
  'Will Okafor',
  'Xander Hale',
  'Yasmin Diaz',
  'Yusuf Ali',
  'Zach Moore',
];
const LAST = ['Zainab Bello', 'Zara Okafor', 'Zoe Brennan'];

const POPKINS: [string, string, string, string, string[]][] = [
  [
    '00000000-0000-4000-f100-000000000001',
    'Lakeside Weekend',
    '🏕️',
    'Teal',
    ['Dev Patel', 'Ellie Brennan', 'Grace Adeyemi', 'Walt Brennan', ...LATER, ...LAST],
  ],
  [
    '00000000-0000-4000-f100-000000000002',
    'Thursday Night Group',
    '🕯️',
    'Amber',
    [
      'Ellie Brennan',
      'Joel Kim',
      'Ruth Lindqvist',
      'Walt Brennan',
      'Will Okafor',
      'Yusuf Ali',
      'Zach Moore',
      'Zoe Brennan',
    ],
  ],
  [
    '00000000-0000-4000-f100-000000000003',
    'Tigers U9 Parents',
    '⚽',
    'Leaf',
    [
      'Amir Haddad',
      'Bea Collins',
      'Priya Nair',
      'Sam Ortega',
      'Sanjay Rao',
      'Tariq Hassan',
      'Uma Shah',
      'Vera Novak',
      'Walt Brennan',
      ...LATER,
      ...LAST,
    ],
  ],
];

const everyone = [...new Set(POPKINS.flatMap(([, , , , people]) => people))].sort();

/** A person's account id, the same under every Popkin. */
export function personId(name: string): string {
  return `00000000-0000-4000-f000-${String(everyone.indexOf(name) + 1).padStart(12, '0')}`;
}

function person(name: string): object {
  const [accent, photo] = FACES[name] ?? ['Leaf', null];
  return {
    personId: personId(name),
    name,
    initials: name
      .split(' ')
      .map((p) => p[0])
      .join(''),
    accent,
    photoUrl: photo ? `/api/files/contacts/${photo}` : null,
  };
}

/** The candidates as the Import mocks draw them: 23 people in three Popkins. */
export function candidatesAsDrawn(): object {
  return {
    total: everyone.length,
    popkins: POPKINS.map(([popkinId, name, emoji, colour, people]) => ({
      popkinId,
      name,
      emoji,
      colour,
      peopleCount: people.length,
      people: people.map(person),
    })),
  };
}

/** Import answers with the mocks' people. */
export async function marasCandidates(page: Page): Promise<void> {
  await servePhotos(page);
  await answer(page, importKey, { status: 200, body: candidatesAsDrawn() });
}

export function noCandidates(page: Page): Promise<void> {
  return answer(page, importKey, { status: 200, body: { total: 0, popkins: [] } });
}
