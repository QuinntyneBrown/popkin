import type { Page } from '@playwright/test';
import responses from './api/responses.json';
import { faceId } from './connections';
import { peopleKey, servePhotos } from './contacts';
import { answer } from './stubs';

/** Groups on the morning of the mocks. */
export const groupsKey = 'GET /api/contacts/groups?on=2026-09-15';
/** Groups as the contact form reads them, for their names only, without the day. */
export const formGroupsKey = 'GET /api/contacts/groups';

/** [name, accent, photo, known as, last talked on, days ago] of the people in the mocks' groups. */
type Member = [string, string, string | null, string | null, string | null, number | null];

const MEMBERS: Record<string, Member> = {
  'Ada Okafor': ['Ada Okafor', 'Coral', 'contact-ada.jpg', null, null, null],
  'Ifeoma Okafor': ['Ifeoma Okafor', 'Berry', null, null, null, null],
  'Chidi Okafor': ['Chidi Okafor', 'Sky', 'contact-chidi.jpg', 'Brother', null, null],
  'Tomás Reyes': ['Tomás Reyes', 'Leaf', null, null, null, null],
  'Walt Brennan': ['Walt Brennan', 'Leaf', 'call2.jpg', 'Thursday group', '2026-09-10', 5],
  'Ellie Brennan': ['Ellie Brennan', 'Berry', 'call4.jpg', 'Thursday group', '2026-09-10', 5],
  'Ruth Lindqvist': ['Ruth Lindqvist', 'Teal', 'contact-ruth.jpg', 'Next door, no. 14', '2026-09-12', 3],
  'Joel Kim': ['Joel Kim', 'Sky', null, 'Thursday group', '2026-08-20', 26],
  'Grace Adeyemi': ['Grace Adeyemi', 'Plum', 'contact-grace.jpg', 'Best friend from uni', '2026-09-11', 4],
  'Ben Hale': ['Ben Hale', 'Amber', null, 'Uni friend', '2026-09-05', 10],
  'Priya Nair': ['Priya Nair', 'Coral', null, null, null, null],
  'Sam Ortega': ['Sam Ortega', 'Amber', null, null, null, null],
  'Dev Patel': ['Dev Patel', 'Sky', 'call3.jpg', null, null, null],
};

/** A member's id: a face of the map keeps its id; Joel, who is on no map, has his own. */
export function memberId(name: string): string {
  return name === 'Joel Kim' ? '00000000-0000-4000-d000-000000000099' : faceId(name);
}

export function groupId(n: number): string {
  return `00000000-0000-4000-e000-${String(n).padStart(12, '0')}`;
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('');
}

function member(name: string): object {
  const [fullName, accent, photo, knownAs, on, days] = MEMBERS[name];
  return {
    contactId: memberId(name),
    firstName: fullName.split(' ')[0],
    fullName,
    initials: initials(fullName),
    accent,
    photoUrl: photo ? `/api/files/contacts/${photo}` : null,
    knownAs,
    circle: null,
    lastTalkedOn: on,
    lastTalkedDays: days,
  };
}

/** [whose, kind, title, day] */
type Soon = [string, 'Birthday' | 'Other', string | null, string];

function soon([name, kind, title, on]: Soon, i: number): object {
  const [fullName, accent, photo] = MEMBERS[name];
  return {
    id: `00000000-0000-4000-e100-${String(i + 1).padStart(12, '0')}`,
    contactId: memberId(name),
    firstName: fullName.split(' ')[0],
    photoUrl: photo ? `/api/files/contacts/${photo}` : null,
    initials: initials(fullName),
    accent,
    kind,
    title,
    occursOn: on,
    daysLeft: 0,
    years: null,
    lead: 'OneWeekBefore',
  };
}

interface GroupRow {
  name: string;
  kind: 'Household' | 'SmallGroup' | 'Team' | 'Club';
  emoji: string;
  accent: string;
  members: string[];
  note: string | null;
  comingUp: Soon[];
  popkin: { id: string; name: string } | null;
}

/** Mara's groups as the Groups mocks draw them, in the list's order. */
const GROUPS: GroupRow[] = [
  {
    name: 'Mum’s house',
    kind: 'Household',
    emoji: '🏡',
    accent: 'Coral',
    members: ['Ada Okafor', 'Ifeoma Okafor'],
    note: null,
    comingUp: [],
    popkin: null,
  },
  {
    name: 'Chidi & Tomás',
    kind: 'Household',
    emoji: '🏡',
    accent: 'Sky',
    members: ['Chidi Okafor', 'Tomás Reyes'],
    note: null,
    comingUp: [],
    popkin: null,
  },
  {
    name: 'Thursday Night Group',
    kind: 'SmallGroup',
    emoji: '🕯️',
    accent: 'Amber',
    members: ['Walt Brennan', 'Ellie Brennan', 'Ruth Lindqvist', 'Joel Kim'],
    note: 'Thursdays 7:30 at Walt’s. Bring something to share.',
    comingUp: [
      ['Ruth Lindqvist', 'Birthday', null, '2026-10-24'],
      ['Walt Brennan', 'Birthday', null, '2026-11-16'],
    ],
    popkin: { id: '00000000-0000-4000-e200-000000000001', name: 'Thursday Night Group' },
  },
  {
    name: 'Sheffield lot',
    kind: 'SmallGroup',
    emoji: '🕯️',
    accent: 'Plum',
    members: ['Grace Adeyemi', 'Ben Hale'],
    note: 'Reunion weekend every October.',
    comingUp: [
      ['Grace Adeyemi', 'Birthday', null, '2026-09-19'],
      ['Ben Hale', 'Other', 'Iris is one month old', '2026-10-05'],
      ['Grace Adeyemi', 'Other', 'Grace & Femi’s wedding', '2026-12-26'],
    ],
    popkin: null,
  },
  {
    name: 'Tigers U9',
    kind: 'Team',
    emoji: '🤝',
    accent: 'Leaf',
    members: ['Priya Nair', 'Sam Ortega'],
    note: null,
    comingUp: [],
    popkin: null,
  },
  {
    name: 'Studio design team',
    kind: 'Team',
    emoji: '🤝',
    accent: 'Sky',
    members: ['Dev Patel', 'Sam Ortega'],
    note: null,
    comingUp: [],
    popkin: null,
  },
];

/** The groups' bodies as drawn. */
export function groupsAsDrawn(): object[] {
  return GROUPS.map((g, i) => ({
    id: groupId(i + 1),
    name: g.name,
    kind: g.kind,
    emoji: g.emoji,
    accent: g.accent,
    note: g.note,
    members: g.members.map(member),
    comingUp: g.comingUp.map(soon),
    popkin: g.popkin,
  }));
}

/** The id of a group of the mocks, by name. */
export function groupOf(name: string): string {
  return groupId(GROUPS.findIndex((g) => g.name === name) + 1);
}

/** Groups answers with the mocks' groups, and People with the people in them. */
export async function marasGroups(page: Page): Promise<void> {
  await servePhotos(page);
  await answer(page, groupsKey, { status: 200, body: groupsAsDrawn() });
  await answer(page, formGroupsKey, { status: 200, body: groupsAsDrawn() });
  await answer(page, peopleKey, { status: 200, body: peopleOfTheGroups() });
}

export async function noGroups(page: Page): Promise<void> {
  await answer(page, groupsKey, { status: 200, body: [] });
  await answer(page, formGroupsKey, { status: 200, body: [] });
}

/** People, as Add people reads them: everyone in the groups, A to Z. */
export function peopleOfTheGroups(): object {
  const recorded = responses[peopleKey].body;
  return {
    ...recorded,
    contacts: Object.values(MEMBERS)
      .map(([name, accent, photo, knownAs]) => ({
        id: memberId(name),
        name,
        firstName: name.split(' ')[0],
        knownAs,
        circle: null,
        isClosest: false,
        photoUrl: photo ? `/api/files/contacts/${photo}` : null,
        initials: initials(name),
        accent,
        nextDate: null,
        lastTalkedOn: null,
        lastTalkedDays: null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

/** The group New group makes: "Book club", a club, with Grace and Ruth. */
export function bookClub(): object {
  return {
    id: groupId(7),
    name: 'Book club',
    kind: 'Club',
    emoji: '⭐',
    accent: 'Teal',
    note: 'Last Sunday of the month, at the Central Library café.',
    members: ['Grace Adeyemi', 'Ruth Lindqvist'].map(member),
    comingUp: [],
    popkin: null,
  };
}
