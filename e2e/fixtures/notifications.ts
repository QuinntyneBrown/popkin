import type { Page } from '@playwright/test';
import responses from './api/responses.json';
import { servePhotos } from './contacts';
import { answer, answerOnce, hold, problem } from './stubs';

const settings = responses['GET /api/me/notifications'].body;

/**
 * Mara's notification settings as the mocks draw them: an account with an email address, activity
 * email on, as it happens. The recording is of an account that signs in by phone, so it has none.
 */
export async function theMockNotificationSettings(page: Page): Promise<void> {
  await answer(page, 'GET /api/me/notifications', {
    status: 200,
    body: { ...settings, email: { on: true, available: true, frequency: 'AsItHappens' } },
  });
}

/**
 * Mara's settings with "New photos" switched off for everyone by an admin, her own choice kept
 * (`off-by-popkin.html`, L2-171 AC4).
 */
export async function newPhotosOffForEveryone(page: Page): Promise<void> {
  await answer(page, 'GET /api/me/notifications', {
    status: 200,
    body: {
      ...settings,
      email: { on: true, available: true, frequency: 'AsItHappens' },
      groups: settings.groups.map((group) => ({
        ...group,
        kinds: group.kinds.map((kind) =>
          kind.kind === 'NewPhotos' ? { ...kind, offForEveryone: true } : kind,
        ),
      })),
    },
  });
}

/** The settings of an account that signs in by phone, as recorded: no email to switch on (L2-156 AC5). */
export async function settingsWithoutAnEmailAddress(page: Page): Promise<void> {
  await answer(page, 'GET /api/me/notifications', { status: 200, body: settings });
}

/** The settings held in flight: the loading state. */
export async function theNotificationSettingsLoading(page: Page): Promise<() => void> {
  return hold(page, 'GET /api/me/notifications');
}

/** The settings cannot be read: the error state (L2-155 AC6). */
export async function theNotificationSettingsFailing(page: Page): Promise<void> {
  await answer(page, 'GET /api/me/notifications', problem(500, 'unexpected'));
}

/** The settings fail once, then load: "Try again". */
export async function theNotificationSettingsFailingOnce(page: Page): Promise<void> {
  await theMockNotificationSettings(page);
  await answerOnce(page, 'GET /api/me/notifications', problem(500, 'unexpected'));
}

/** Saving any one setting fails (L2-155 AC5). */
export async function savingFails(page: Page): Promise<void> {
  for (const key of [
    'PUT /api/me/notifications/kinds/GroupChat',
    'PUT /api/me/notifications/frequency',
    'PUT /api/me/notifications/email',
  ]) {
    await answer(page, key, problem(500, 'unexpected'));
  }
}

/** Mara's settings with the daily digest chosen, as `daily.html` draws them. */
export async function theDailyDigestChosen(page: Page): Promise<void> {
  await answer(page, 'GET /api/me/notifications', {
    status: 200,
    body: { ...settings, email: { on: true, available: true, frequency: 'DailyDigest' } },
  });
}

/** Turning email on again is answered as the API does for an account with an address. */
export async function emailCanBeTurnedBackOn(page: Page): Promise<void> {
  await answer(page, 'PUT /api/me/notifications/email', { status: 204 });
}

/** Saving `kind` is answered as the API does; the recording holds Group chat's only. */
export async function savingTheKind(page: Page, kind: string): Promise<void> {
  await answer(page, `PUT /api/me/notifications/kinds/${kind}`, { status: 204 });
}

/** The day `popkins.html` is drawn on, a Tuesday: Lakeside wraps up that Sunday. */
const DRAWN_ON = new Date('2026-11-17T12:00:00');

/** The three Popkins of `popkins.html`, each with its level (L2-158 AC1). */
export const MOCK_POPKINS = [
  {
    popkinId: '7d1c2a40-0000-4000-8000-000000000001',
    name: 'Lakeside Weekend',
    emoji: '🏕️',
    colour: 'Teal',
    people: 14,
    endsAt: '2026-11-22T20:00:00',
    level: 'Everything',
  },
  {
    popkinId: '7d1c2a40-0000-4000-8000-000000000002',
    name: 'Thursday Night Group',
    emoji: '🕯️',
    colour: 'Amber',
    people: 9,
    endsAt: null,
    level: 'JustForMe',
  },
  {
    popkinId: '7d1c2a40-0000-4000-8000-000000000003',
    name: 'Tigers U9 Parents',
    emoji: '⚽',
    colour: 'Leaf',
    people: 22,
    endsAt: '2026-11-30T20:00:00',
    level: 'Everything',
  },
];

/**
 * Mara's settings with the mock's three Popkins on the day the mock is drawn, and each level saved
 * as the API does.
 */
export async function theMockPopkinLevels(page: Page): Promise<void> {
  await page.clock.setFixedTime(DRAWN_ON);
  await answer(page, 'GET /api/me/notifications', {
    status: 200,
    body: {
      ...settings,
      email: { on: true, available: true, frequency: 'AsItHappens' },
      popkins: MOCK_POPKINS,
    },
  });
  for (const popkin of MOCK_POPKINS) {
    await answer(page, `PUT /api/me/notifications/popkins/${popkin.popkinId}`, { status: 204 });
  }
}

/** The two people `people.html` shows muted, each with the Popkins they share with Mara (L2-160 AC1). */
export const MOCK_MUTED = [
  {
    muteId: '5e0e7a10-0000-4000-8000-000000000001',
    name: 'Sam Ortega',
    avatar: { initials: 'SO', accent: 'Amber', photoUrl: null },
    sharedPopkins: ['Thursday Night Group'],
  },
  {
    muteId: '5e0e7a10-0000-4000-8000-000000000002',
    name: 'Joel Kim',
    avatar: { initials: 'JK', accent: 'Sky', photoUrl: null },
    sharedPopkins: ['Lakeside Weekend'],
  },
];

/** The people "Mute someone" offers before anything is typed (`mute-search.html`). */
export const MOCK_CANDIDATES = [
  ['Dev Patel', 'DP', 'Sky', 'Lakeside Weekend'],
  ['Grace Adeyemi', 'GA', 'Plum', 'Lakeside Weekend'],
  ['Priya Nair', 'PN', 'Coral', 'Tigers U9 Parents'],
  ['Ruth Lindqvist', 'RL', 'Teal', 'Lakeside Weekend'],
  ['Walt Brennan', 'WB', 'Leaf', 'Thursday Night Group'],
].map(([name, initials, accent, popkin], i) => ({
  membershipId: `3c5a9b20-0000-4000-8000-00000000000${i + 1}`,
  name,
  avatar: { initials, accent, photoUrl: null },
  sharedPopkins: [popkin],
}));

/**
 * The seven birthdays in Mara's contacts as `people.html` draws them on Saturday 12 September,
 * soonest first; Ifeoma's is switched off (L2-159 AC1).
 */
export const MOCK_BIRTHDAYS = (
  [
    ['Grace Adeyemi', 'Plum', 'contact-grace.jpg', '2026-09-19', 33, 7, 'OneWeekBefore', true],
    ['Ada Okafor', 'Amber', 'contact-ada.jpg', '2026-10-07', 64, 25, 'OneWeekBefore', true],
    ['Ruth Lindqvist', 'Teal', null, '2026-10-24', 78, 42, 'ThreeDaysBefore', true],
    ['Chidi Okafor', 'Leaf', 'contact-chidi.jpg', '2027-01-24', 34, 134, 'OneWeekBefore', true],
    ['Ifeoma Okafor', 'Berry', null, '2027-02-11', 29, 152, 'OnTheDay', false],
    ['Walt Brennan', 'Sky', null, '2027-03-02', null, 171, 'OneWeekBefore', true],
    ['Dev Patel', 'Coral', null, '2027-06-14', 41, 275, 'OneDayBefore', true],
  ] as const
).map(([name, accent, photo, occursOn, turns, inDays, lead, remindersOn], i) => ({
  keyDateId: `6b1d4e30-0000-4000-8000-00000000000${i + 1}`,
  contactId: `6b1d4e30-0000-4000-9000-00000000000${i + 1}`,
  name,
  photoUrl: photo ? `/api/files/contacts/${photo}` : null,
  initials: name
    .split(' ')
    .map((part) => part[0])
    .join(''),
  accent,
  occursOn,
  turns,
  inDays,
  lead,
  remindersOn,
}));

/**
 * Mara's settings with Sam and Joel muted and her seven birthdays, the people she could mute, and
 * muting, unmuting and each birthday's change answered as the API does.
 */
export async function theMockMutedPeople(
  page: Page,
  muted = MOCK_MUTED,
  birthdays: readonly object[] = MOCK_BIRTHDAYS,
): Promise<void> {
  await servePhotos(page);
  await answer(page, 'GET /api/me/notifications', {
    status: 200,
    body: {
      ...settings,
      email: { on: true, available: true, frequency: 'AsItHappens' },
      muted,
      birthdays,
      birthdayCount: birthdays.length,
    },
  });
  for (const birthday of MOCK_BIRTHDAYS) {
    await answer(page, `PUT /api/contacts/key-dates/${birthday.keyDateId}/reminder`, {
      status: 200,
      body: {},
    });
  }
  await answer(page, 'GET /api/me/notifications/mute-candidates?q=', {
    status: 200,
    body: MOCK_CANDIDATES,
  });
  await answer(page, 'GET /api/me/notifications/mute-candidates?q=wa', {
    status: 200,
    body: MOCK_CANDIDATES.filter((c) => c.name.toLowerCase().includes('wa')),
  });
  const walt = MOCK_CANDIDATES[4];
  await answer(page, 'POST /api/me/notifications/mutes', {
    status: 200,
    body: { ...walt, membershipId: undefined, muteId: '5e0e7a10-0000-4000-8000-000000000003' },
  });
  for (const mute of MOCK_MUTED) {
    await answer(page, `DELETE /api/me/notifications/mutes/${mute.muteId}`, { status: 204 });
  }
}

/**
 * Mara's People view where Joel, still muted, shares no Popkin with her any more, and a search
 * for "zed" finds nobody (`mute-no-match.html`, L2-160).
 */
export async function noOneMatches(page: Page): Promise<void> {
  await theMockMutedPeople(page, [MOCK_MUTED[0], { ...MOCK_MUTED[1], sharedPopkins: [] }]);
  await answer(page, 'GET /api/me/notifications/mute-candidates?q=zed', { status: 200, body: [] });
}

/** Mara's People view with no birthday in her contacts (`no-birthdays.html`, L2-159 AC6). */
export async function noBirthdaysYet(page: Page): Promise<void> {
  await theMockMutedPeople(page, MOCK_MUTED, []);
}
