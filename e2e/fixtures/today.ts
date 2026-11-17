import type { Page } from '@playwright/test';
import { contactsOfMara, recordedContactId, servePhotos } from './contacts';

let made = 0;
import { answer } from './stubs';

/** Today on the morning of the mocks (L2-125). */
export const todayKey = 'GET /api/contacts/today?on=2026-09-15';

const photo = (file: string): string => `/api/files/contacts/${file}`;

/** Chidi is the recorded contact whose profile opens; the others are ids of their own. */
function contact(name: string, accent: string, file: string | null) {
  made += 1;
  const id =
    name === 'Chidi Okafor'
      ? recordedContactId(name)
      : `00000000-0000-4000-b000-${String(made).padStart(12, '0')}`;
  const [first, last] = name.split(' ');
  return { id, first, initials: `${first[0]}${last[0]}`, accent, photoUrl: file && photo(file) };
}

const grace = contact('Grace Adeyemi', 'Plum', 'contact-grace.jpg');
const chidi = contact('Chidi Okafor', 'Sky', 'contact-chidi.jpg');
const ben = contact('Ben Hale', 'Amber', null);
const ada = contact('Ada Okafor', 'Coral', 'contact-ada.jpg');
const ruth = contact('Ruth Lindqvist', 'Teal', 'contact-ruth.jpg');
const dev = contact('Dev Patel', 'Sky', 'call3.jpg');
const sam = contact('Sam Ortega', 'Amber', null);
const joel = contact('Joel Kim', 'Sky', null);

type Face = ReturnType<typeof contact>;

function date(
  who: Face,
  kind: string,
  title: string | null,
  occursOn: string,
  daysLeft: number,
  years: number | null,
) {
  return {
    id: `${who.id.slice(0, -4)}d${daysLeft.toString().padStart(3, '0')}`,
    contactId: who.id,
    firstName: who.first,
    photoUrl: who.photoUrl,
    initials: who.initials,
    accent: who.accent,
    kind,
    title,
    occursOn,
    daysLeft,
    years,
    lead: 'OneWeekBefore',
  };
}

function followUp(id: string, who: Face, text: string, dueOn: string) {
  return {
    id,
    text,
    contactId: who.id,
    contactFirstName: who.first,
    contactInitials: who.initials,
    contactAccent: who.accent,
    contactPhotoUrl: who.photoUrl,
    dueOn,
    isPromise: true,
    promisedVia: 'InPerson',
    promisedOn: '2026-09-10',
    createdAt: '2026-09-10T10:00:00Z',
    doneAt: null,
  };
}

function entry(
  who: Face,
  kind: string,
  channel: string | null,
  title: string | null,
  note: string,
  day: string,
  daysAgo: number,
) {
  return {
    entryId: `${who.id.slice(0, -4)}e${daysAgo.toString().padStart(3, '0')}`,
    contactId: who.id,
    firstName: who.first,
    initials: who.initials,
    accent: who.accent,
    photoUrl: who.photoUrl,
    kind,
    channel,
    title,
    note,
    day,
    daysAgo,
  };
}

const drifting = (who: Face, daysSince: number) => ({
  contactId: who.id,
  firstName: who.first,
  initials: who.initials,
  accent: who.accent,
  photoUrl: who.photoUrl,
  daysSince,
});

export const ladderId = '00000000-0000-4000-c000-000000000002';

/** Mara's day as default.html draws it. */
export function marasDay(): object {
  return {
    firstName: 'Mara',
    people: 13,
    next: {
      date: date(grace, 'Birthday', null, '2026-09-19', 4, 33),
      knownAs: 'Best friend from uni',
      phone: '+44 7700 900155',
      loves: ['Pottery', 'natural wine', 'Sunday markets'],
      lastTime: 'Venue’s booked.',
    },
    comingUp: [
      date(chidi, 'Anniversary', null, '2026-09-26', 11, 5),
      date(ben, 'Other', 'Iris is one month old', '2026-10-05', 20, null),
      date(ada, 'Birthday', null, '2026-10-07', 22, 64),
      date(ruth, 'Birthday', null, '2026-10-24', 39, 78),
    ],
    followUps: [
      followUp(
        '00000000-0000-4000-c000-000000000001',
        dev,
        'Introduce Dev to Priya about the design role',
        '2026-09-13',
      ),
      followUp(ladderId, ruth, 'Return Ruth’s ladder', '2026-09-15'),
    ],
    overdueHabits: [
      {
        id: '00000000-0000-4000-c100-000000000001',
        contactId: chidi.id,
        contactFirstName: 'Chidi',
        contactName: 'Chidi Okafor',
        contactInitials: chidi.initials,
        contactAccent: chidi.accent,
        contactPhone: '+44 7700 900788',
        contactPhotoUrl: chidi.photoUrl,
        what: 'Lunch',
        rhythm: 'EveryTwoWeeks',
        startedOn: '2026-01-04',
        lastTime: '2026-08-30',
        dueOn: '2026-09-13',
        kept: [],
      },
    ],
    recently: [
      entry(
        ada,
        'Conversation',
        'Phone',
        null,
        'Knee is better since physio. She wants a family lunch for her birthday, not a party.',
        '2026-09-13',
        2,
      ),
      entry(
        ruth,
        'Conversation',
        'InPerson',
        null,
        'Her grandson visits in October. Still need to return the ladder.',
        '2026-09-12',
        3,
      ),
      entry(
        grace,
        'Conversation',
        'Video',
        null,
        'Venue’s booked. She asked if I’d do a reading — said yes! Wants something by Mary Oliver.',
        '2026-09-11',
        4,
      ),
      entry(
        dev,
        'Milestone',
        null,
        'Moved to Chapel Allerton',
        'Housewarming on Saturday 3 October.',
        '2026-09-07',
        8,
      ),
      entry(
        chidi,
        'Conversation',
        'Phone',
        null,
        'Loving the team, hates the commute. Thinking of moving closer to Piccadilly by Christmas. Tomás is pushing for a dog.',
        '2026-09-06',
        9,
      ),
    ],
    drifting: [drifting(sam, 59), drifting(joel, 33)],
  };
}

/** Today as the mocks draw it, with its photos. */
export async function marasToday(page: Page, change: object = {}): Promise<void> {
  await contactsOfMara(page);
  await servePhotos(page);
  await answer(page, todayKey, { status: 200, body: { ...marasDay(), ...change } });
}
