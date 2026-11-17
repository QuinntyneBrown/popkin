/**
 * Records the API's answers into fixtures/api/responses.json (ADR 0005). Run it against the local
 * API (`pwsh eng/Start-E2eApi.ps1`) when an endpoint's answer changes, and commit the result in
 * the same change. It is maintenance, never part of a test run.
 *
 * The journey below is the cast of the mocks: Mara signs up and starts Lakeside Weekend, Walt
 * and Dev join it, Joel opens its invite and joins, Walt and Mara write in the Everyone
 * thread, Mara opens the Popkin's home, saves its settings as they were, starts a group call
 * and leaves it, she adds the album's first photo, she shares an experience, rates it and
 * comments on it, she wraps the Popkin up and reads its recap, and Dev leaves it. Then she gives her full name, reads her
 * account and saves a photo; Joel signs out; and Mara deletes her account. Last, Lena Fischer
 * signs in to the admin app, adds three admins and turns Schedules off. Each answer is keyed
 * "METHOD /api/path?query", the key the e2e fixture looks up, so one answer is kept per key:
 * the accounts answers are Mara's, and the other people's sign-ups are not recorded.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const api = process.env['PK_API'] ?? 'http://localhost:5080';
const mockImages = join(import.meta.dirname, '..', '..', 'docs', 'mocks', 'assets', 'images');
const recorded: Record<string, { status: number; body?: unknown }> = {};

/** One person's browser: their session cookie, and whether their answers are recorded. */
interface Person {
  cookie: string;
  record: boolean;
}

const mara: Person = { cookie: '', record: true };
let person = mara;

async function call(method: string, path: string, body?: unknown, record = true) {
  const key = `${method} ${path}`;
  const form = body instanceof FormData;
  const response = await fetch(`${api}${path}`, {
    method,
    headers: {
      ...(form ? {} : { 'content-type': 'application/json' }),
      'sec-fetch-site': 'same-origin',
      ...(person.cookie ? { cookie: person.cookie } : {}),
    },
    body: body === undefined ? undefined : form ? body : JSON.stringify(body),
  });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) person.cookie = setCookie.split(';')[0];
  const text = await response.text();
  const json = text ? JSON.parse(text) : undefined;
  if (person.record && record) {
    recorded[key] =
      json === undefined ? { status: response.status } : { status: response.status, body: json };
  }
  if (response.status >= 400) {
    throw new Error(`${key} answered ${response.status}: ${text}`);
  }
  return json;
}

/** Signs someone else up, without recording it, and makes them the caller. */
async function signUp(name: string, phone: string, record = false): Promise<Person> {
  person = { cookie: '', record: false };
  const code = await call('POST', '/api/auth/codes', {
    purpose: 'SignUp',
    channel: 'Phone',
    destination: phone,
  });
  await call('POST', `/api/auth/codes/${code.verificationId}/confirm`, { code: '482913', name });
  person.record = record;
  return person;
}

function joinForm(displayName: string): FormData {
  const form = new FormData();
  form.set('displayName', displayName);
  return form;
}

// The ways to sign in: eng/Start-E2eApi.ps1 switches phone sign-in on (L2-084, ADR 0023).
await call('GET', '/api/auth/channels');
// Accounts: Mara signs up with the number the mocks show; every local code is 482913.
const sent = await call('POST', '/api/auth/codes', {
  purpose: 'SignUp',
  channel: 'Phone',
  destination: '(415) 555-0148',
});
const verification = sent.verificationId as string;
await call('POST', `/api/auth/codes/${verification}/confirm`, { code: '482913', name: 'Mara' });
await call('GET', '/api/auth/session');
// A new code may be asked for 30 seconds after the first (L2-005 AC1).
await new Promise((resolve) => setTimeout(resolve, 31_000));
await call('POST', `/api/auth/codes/${verification}/resend`);

// Popkins: Mara is offered Plan and Schedules (L2-152 AC8), and starts Lakeside Weekend, Teal,
// for the weekend (Sunday at 6 pm), with both on.
await call('GET', '/api/popkins/features');
const sunday = new Date();
sunday.setDate(sunday.getDate() + ((7 - sunday.getDay()) % 7 || 7));
sunday.setHours(18, 0, 0, 0);
const created = await call('POST', '/api/popkins', {
  name: 'Lakeside Weekend',
  emoji: '🏕️',
  colour: 'Teal',
  length: 'TheWeekend',
  endsAt: sunday.toISOString(),
  plan: true,
  schedules: true,
});
await call('GET', `/api/popkins/${created.id}/invite`);

// Invitations: Walt and Dev join, then Joel opens the invite as a visitor, signs up and joins.
const invite = `/api/invites/${created.inviteCode}`;
const walt = await signUp('Walt Brennan', '(415) 555-0177');
await call('POST', `${invite}/join`, joinForm('Walt Brennan'));
const dev = await signUp('Dev Patel', '(415) 555-0162');
await call('POST', `${invite}/join`, joinForm('Dev Patel'));
person = { cookie: '', record: true };
await call('GET', invite);
const joel = await signUp('Joel', '(415) 555-0123', true);
await call('GET', `${invite}/members`);
await call('POST', `${invite}/join`, joinForm('Joel'));

// Chat: Walt writes to everyone; Mara opens the Everyone thread, reads it, answers and is told
// who is here. Nobody holds a hub connection while this runs, so nobody is here now.
person = walt;
const everyone = await call('GET', `/api/popkins/${created.id}/threads/everyone`);
const messages = `/api/popkins/${created.id}/threads/${everyone.id}/messages`;
await call('POST', messages, {
  clientMessageId: '7b0e7a52-5f0e-4d57-9d5c-3f0f8a3c1e01',
  text: 'Pancakes at the main cabin, 8:30. Bring an appetite.',
});
person = mara;
await call('GET', `/api/popkins/${created.id}/threads/everyone`);
const page = await call('GET', messages);
// What the app reads once its hub connection is up: anything newer, then the window it shows.
await call('GET', `${messages}?after=${page.items.at(-1).id}`);
await call('GET', `${messages}?from=${page.items[0].id}&to=${page.items.at(-1).id}`);
await call('PUT', `/api/popkins/${created.id}/threads/${everyone.id}/read`, {
  lastReadMessageId: page.items.at(-1).id,
});
await call('POST', messages, {
  clientMessageId: '7b0e7a52-5f0e-4d57-9d5c-3f0f8a3c1e02',
  text: 'On it! Also: last call for the canoe sign-up 🛶',
});
await call('GET', `/api/popkins/${created.id}/presence`);

// Direct messages: Mara writes to Walt alone, then lists her threads; neither is on a call.
const members = await call('GET', `/api/popkins/${created.id}/members`);
const waltsId = members.find(
  (m: { displayName: string }) => m.displayName === 'Walt Brennan',
).membershipId;
const direct = await call('PUT', `/api/popkins/${created.id}/threads/direct/${waltsId}`);
await call('POST', `/api/popkins/${created.id}/threads/${direct.id}/messages`, {
  clientMessageId: '7b0e7a52-5f0e-4d57-9d5c-3f0f8a3c1e03',
  text: 'Walt, your pancakes were unreal. Is that your mum’s recipe?',
});
await call('GET', `/api/popkins/${created.id}/threads/${direct.id}/messages`);
await call('GET', `/api/popkins/${created.id}/calls/current?threadId=${direct.id}`);
await call('GET', `/api/popkins/${created.id}/threads`);

// The Popkin home: Mara reads the header and its four sections. Photos and experiences are
// empty until their journeys.
await call('GET', `/api/popkins/${created.id}`);
// The switches an open screen reads every minute (L2-077 AC4): Schedules on, as the seed sets it.
await call('GET', `/api/popkins/${created.id}/features`);
await call('GET', `/api/popkins/${created.id}/threads/everyone/preview`);
await call('GET', `/api/popkins/${created.id}/photos/summary`);
await call('GET', `/api/popkins/${created.id}/experiences/summary`);
await call('GET', `/api/popkins/${created.id}/members`);

// Popkin settings: Mara saves its name and look, and how long it lasts, as they were, so the
// Popkin stays the one the mocks draw.
await call('PATCH', `/api/popkins/${created.id}`, {
  name: 'Lakeside Weekend',
  emoji: '🏕️',
  colour: 'Teal',
});
await call('PUT', `/api/popkins/${created.id}/length`, {
  length: 'TheWeekend',
  endsAt: sunday.toISOString(),
});
// Features: Mara saves both on, as they were (L2-153).
await call('PUT', `/api/popkins/${created.id}/features`, { plan: true, schedules: true });

// The Schedule (journey 22, with Features:Schedules on): Mara sets the event, reads the week
// of time off that holds it and adds hers, reads this week and enters her hours, and reads the
// home's Schedule summary. The dates are the mocks'; the header above was read before the event.
const schedule = `/api/popkins/${created.id}/schedule`;
const marasId = members.find((m: { isViewer: boolean }) => m.isViewer).membershipId;
await call('PUT', `/api/popkins/${created.id}/event`, {
  label: 'Lake weekend',
  firstDay: '2026-09-25',
  lastDay: '2026-09-27',
});
await call('GET', `${schedule}/time-off?week=2026-09-21`);
await call('PUT', `${schedule}/time-off/${marasId}`, {
  week: '2026-09-21',
  days: ['Working', 'Working', 'Working', 'Tentative', 'Off'],
});
await call('GET', `${schedule}/week?from=2026-09-12`);
await call('PUT', `${schedule}/hours/${marasId}`, {
  from: '2026-09-12',
  days: [[], [], [{ start: '09:00', end: '17:30' }], [], [], [], []],
});
await call('GET', `${schedule}/summary?from=2026-09-12`);

// The Plan (journey 21, with Features:Plan on): Mara reads the board before any story, adds
// three, moves the van to Doing, gives the cabin a due date, reads the board, the burn-down and
// the home's Plan summary, and deletes a story she added. The recap, read last, counts them.
const plan = `/api/popkins/${created.id}/plan`;
await call('GET', plan);
const cabin = await call('POST', `${plan}/stories`, {
  title: 'Book the cabin at Pine Hollow',
  column: 'ToDo',
  points: 8,
  ownerMembershipId: marasId,
  tag: 'Stay',
});
const van = await call('POST', `${plan}/stories`, {
  title: 'Rent a 7-seat van',
  column: 'ToDo',
  points: 5,
  ownerMembershipId: null,
  tag: 'Travel',
});
const kayaks = await call('POST', `${plan}/stories`, {
  title: 'Kayak rental for two days',
  column: 'Backlog',
  points: 3,
  ownerMembershipId: null,
  tag: 'Fun',
});
await call('PUT', `${plan}/stories/${van.id}/column`, { column: 'Doing' });
await call('PUT', `${plan}/stories/${cabin.id}`, {
  title: 'Book the cabin at Pine Hollow',
  column: 'ToDo',
  points: 8,
  ownerMembershipId: marasId,
  tag: 'Stay',
  dueDate: '2026-09-18',
});
await call('GET', plan);
await call('GET', `${plan}/burn-down`);
await call('GET', `${plan}/summary`);
await call('DELETE', `${plan}/stories/${kayaks.id}`);

// Calls: no group call is under way, which is what the home and the thread read; then Mara
// starts one, turns her camera off and leaves, which ends it (journey 7).
const calls = `/api/popkins/${created.id}/calls`;
await call('GET', `${calls}/current`);
const joined = await call('POST', calls, { micOn: true, cameraOn: true });
await call('PATCH', `${calls}/${joined.call.id}/participants/me`, { micOn: true, cameraOn: false });
await call('POST', `${calls}/${joined.call.id}/leave`);

// My Popkins: Mara's one active Popkin, as its card (journey 6).
await call('GET', '/api/popkins');

// Contacts, open while `Features:Contacts` is on (journey 25): Mara keeps nobody yet. Then she
// adds Femi, as Add someone draws him (L2-129).
await call('GET', '/api/contacts/summary');
const femi = new FormData();
femi.append(
  'contact',
  JSON.stringify({
    clientId: '00000000-0000-4000-c000-000000000001',
    name: 'Femi Bankole',
    knownAs: 'Grace’s fiancé',
    circle: 'Friends',
    phone: '',
    email: 'femi.b@mail.com',
    city: 'London',
    howWeMet: '',
    loves: ['Arsenal', 'jazz brunches'],
  }),
);
const femiKept = await call('POST', '/api/contacts/people', femi);
// She opens Edit for Femi, as a direct visit reads him, and saves him in Lagos (L2-130).
await call('GET', `/api/contacts/people/${femiKept.id}`);
const femiEdited = new FormData();
femiEdited.append(
  'contact',
  JSON.stringify({
    clientId: '00000000-0000-4000-c000-000000000002',
    name: 'Femi Bankole',
    knownAs: 'Grace’s fiancé',
    circle: 'Friends',
    phone: '',
    email: 'femi.b@mail.com',
    city: 'Lagos',
    howWeMet: '',
    loves: ['Arsenal', 'jazz brunches'],
  }),
);
await call('PUT', `/api/contacts/people/${femiKept.id}`, femiEdited);
// Femi is not in Closest: his menu offers to put him there (L2-131 AC4).
await call('PUT', `/api/contacts/people/${femiKept.id}/closest`);
// She adds Chidi with his photo, as his profile draws him, puts him in Closest and opens his
// profile, then takes him out of Closest from its menu (L2-128, L2-131).
const chidi = new FormData();
chidi.append(
  'contact',
  JSON.stringify({
    clientId: '00000000-0000-4000-c000-000000000003',
    name: 'Chidi Okafor',
    knownAs: 'Brother',
    circle: 'Family',
    phone: '+44 7700 900788',
    email: 'chidi@okafor.dev',
    city: 'Manchester',
    howWeMet: 'Little brother, 3 years younger',
    loves: ['Man City', 'Vinyl — Fela, Sade', 'Long bike rides', 'Hot sauce collecting'],
  }),
);
chidi.append(
  'photo',
  new Blob([readFileSync(join(mockImages, 'contact-chidi.jpg'))], { type: 'image/jpeg' }),
  'contact-chidi.jpg',
);
const chidiKept = await call('POST', '/api/contacts/people', chidi, false);
await call('PUT', `/api/contacts/people/${chidiKept.id}/closest`);
await call('GET', `/api/contacts/people/${chidiKept.id}`);
// She opens People on the morning of the mocks: Chidi and Femi, both in Closest (L2-126).
await call('GET', '/api/contacts/people?on=2026-09-15');
// She adds Chidi's birthday, then opens Dates, everything and birthdays, and changes the
// birthday default (L2-137 to L2-139).
await call('POST', `/api/contacts/people/${chidiKept.id}/key-dates`, {
  clientId: '00000000-0000-4000-c000-000000000010',
  kind: 'Birthday',
  title: null,
  month: 1,
  day: 24,
  year: 1990,
  everyYear: true,
  lead: 'OneWeekBefore',
});
await call('GET', '/api/contacts/dates?on=2026-09-15&kind=all');
await call('GET', '/api/contacts/dates?on=2026-09-15&kind=birthdays');
await call('PUT', '/api/contacts/reminder-preferences', {
  birthdayLead: 'TwoWeeksBefore',
  anniversaryLead: 'ThreeDaysBefore',
  milestoneLead: 'OnTheDay',
  phoneNotifications: true,
  mondayEmail: true,
});
await call('GET', '/api/contacts/reminder-preferences');
// She adds a follow-up for Chidi, due the Sunday after the mocks' Tuesday, reads Follow-ups,
// and ticks it done (L2-141, L2-142).
const commute = await call('POST', '/api/contacts/follow-ups', {
  clientId: '00000000-0000-4000-c000-000000000020',
  text: 'Ask Chidi how the commute is going',
  contactId: chidiKept.id,
  dueOn: '2026-09-20',
});
await call('GET', '/api/contacts/follow-ups');
await call('PUT', `/api/contacts/follow-ups/${commute.id}/done`, { done: true });
// Habits (L2-143 to L2-145, known gap 105 ruled): none yet; she starts lunch every 2 weeks with
// Chidi, says they met up and undoes it, ends it and undoes that, and reads Habits again.
await call('GET', '/api/contacts/habits');
const lunch = await call('POST', '/api/contacts/habits', {
  clientId: '00000000-0000-4000-c000-000000000050',
  contactId: chidiKept.id,
  what: 'Lunch',
  rhythm: 'EveryTwoWeeks',
});
const metUp = await call('POST', `/api/contacts/habits/${lunch.id}/kept`, {
  clientId: '00000000-0000-4000-c000-000000000051',
  keptOn: new Date().toISOString().slice(0, 10),
});
await call('DELETE', `/api/contacts/habits/${lunch.id}/kept/${metUp.keptId}`);
await call('POST', `/api/contacts/habits/${lunch.id}/end`);
await call('DELETE', `/api/contacts/habits/${lunch.id}/end`);
// Connections (L2-149, L2-150, known gap 109 ruled): her map starts with her; she connects Chidi
// and Femi as old friends, reads the map, and removes it again.
await call('GET', '/api/contacts/connections', undefined, false);
const oldFriends = await call('POST', '/api/contacts/connections', {
  clientId: '00000000-0000-4000-c000-000000000060',
  contactId: chidiKept.id,
  otherContactId: femiKept.id,
  kind: 'Friend',
  words: 'Old friends',
  promised: false,
});
await call('GET', '/api/contacts/connections');
await call('DELETE', `/api/contacts/connections/${oldFriends.id}`);
// Groups (L2-146 to L2-148, known gaps 108 and 116 ruled): none yet; she makes a household with
// Chidi, adds Femi, reads Groups and the form's list of them, and starts the Popkin with them.
await call('GET', '/api/contacts/groups?on=2026-09-15', undefined, false);
const sundays = await call('POST', '/api/contacts/groups', {
  clientId: '00000000-0000-4000-c000-000000000070',
  name: 'Sunday lunch',
  kind: 'Household',
  note: 'First Sunday of the month, at Mum’s.',
  contactIds: [chidiKept.id],
});
await call('POST', `/api/contacts/groups/${sundays.id}/members`, { contactIds: [femiKept.id] });
await call('GET', '/api/contacts/groups?on=2026-09-15');
await call('GET', '/api/contacts/groups');
await call('POST', `/api/contacts/groups/${sundays.id}/popkin`, { popkinId: created.id });
// Nothing is logged with Femi (L2-135 AC2). She logs Chidi's new job, every year, and a phone
// call with a promise, as his profile draws them, then reads his timeline: all, milestones,
// conversations (L2-133 to L2-135).
await call('GET', `/api/contacts/people/${femiKept.id}/timeline?show=all`);
await call('POST', `/api/contacts/people/${chidiKept.id}/milestones`, {
  clientId: '00000000-0000-4000-c000-000000000030',
  kind: 'NewJob',
  title: 'Started as Senior Engineer at Arup',
  happenedOn: '2026-08-31',
  note: 'Bridges team. He’d been after this one for two years.',
  everyYear: true,
});
await call('POST', `/api/contacts/people/${chidiKept.id}/conversations`, {
  clientId: '00000000-0000-4000-c000-000000000031',
  channel: 'Phone',
  loggedAt: '2026-09-06T19:30:00+01:00',
  note: 'Loving the team, hates the commute. Thinking of moving closer to Piccadilly by Christmas. Tomás is pushing for a dog.',
  promises: [{ text: 'Send him the flat-hunting checklist', dueOn: '2026-09-17' }],
});
// Memories (L2-136, known gap 107 ruled): Femi has none. Mara keeps Chidi's hot sauce night, the
// photo his timeline draws, then the wedding speech and gift ideas, and reads them.
await call('GET', `/api/contacts/people/${femiKept.id}/memories`);
const hotSauce = new FormData();
hotSauce.append(
  'file',
  new Blob([readFileSync(join(mockImages, 'tacos.jpg'))], { type: 'image/jpeg' }),
  'IMG_4471.jpg',
);
hotSauce.append('clientId', '00000000-0000-4000-c000-000000000040');
hotSauce.append('caption', 'Hot sauce night');
hotSauce.append('takenOn', '2026-08-08');
await call('POST', `/api/contacts/people/${chidiKept.id}/memories/photos`, hotSauce);
const speech = new FormData();
speech.append(
  'file',
  new Blob(['%PDF-1.7\n% The wedding speech\n'], { type: 'application/pdf' }),
  'Wedding speech.pdf',
);
speech.append('clientId', '00000000-0000-4000-c000-000000000041');
await call('POST', `/api/contacts/people/${chidiKept.id}/memories/files`, speech);
await call('POST', `/api/contacts/people/${chidiKept.id}/memories/notes`, {
  clientId: '00000000-0000-4000-c000-000000000042',
  text: 'Gift ideas: Fela reissue on vinyl, Dishoom cookbook, bike lights',
});
await call('GET', `/api/contacts/people/${chidiKept.id}/memories`);
await call('GET', `/api/contacts/people/${chidiKept.id}/timeline?show=all`);
await call('GET', `/api/contacts/people/${chidiKept.id}/timeline?show=milestones`);
await call('GET', `/api/contacts/people/${chidiKept.id}/timeline?show=conversations`);
await call('DELETE', `/api/contacts/people/${chidiKept.id}/closest`);
// She deletes Chidi from his profile (L2-132).
await call('DELETE', `/api/contacts/people/${chidiKept.id}`);

// Photos: Mara has added none, adds one with a caption, then reads the album and the photo.
const album = `/api/popkins/${created.id}/photos`;
await call('GET', `${album}?filter=mine`);
const upload = new FormData();
upload.append(
  'file',
  new Blob([readFileSync(join(mockImages, 'lake.jpg'))], { type: 'image/jpeg' }),
  'lake.jpg',
);
upload.append('caption', 'First light on the dock. Worth the 6 am alarm.');
const added = await call('POST', album, upload);
await call('GET', `${album}?filter=everyone`);
await call('GET', `${album}/${added.id}`);

// Experiences: Mara has shared none, shares the sunrise canoe with its picture, opens it, rates
// it, says a few words, then reads the list again (journey 8). What the home shows was read
// before, while there was none, as the album's summary was.
const experiences = `/api/popkins/${created.id}/experiences`;
await call('GET', `${experiences}?filter=want`);
const canoe = new FormData();
canoe.append('title', 'Sunrise canoe to Heron Point');
canoe.append('kind', 'Did');
canoe.append('when', 'Sat morning');
canoe.append('place', 'Heron Point, Lake Ossia');
canoe.append(
  'picture',
  new Blob([readFileSync(join(mockImages, 'lake.jpg'))], { type: 'image/jpeg' }),
  'lake.jpg',
);
const shared = await call('POST', experiences, canoe);
await call('GET', `${experiences}/${shared.id}`);
await call('PUT', `${experiences}/${shared.id}/my-rating`, { stars: 5 });
await call('PUT', `${experiences}/${shared.id}/my-rating/comment`, {
  text: 'Would do it every morning if I could.',
});
// Mara shares an idea, the beach day, opens it and says she is keen, then takes it back, says
// so again and, as its sharer, says "We did this" (journey 20).
const beach = new FormData();
beach.append('title', 'Beach day next summer?');
beach.append('kind', 'Want');
const idea = await call('POST', experiences, beach);
await call('GET', `${experiences}/${idea.id}`);
await call('DELETE', `${experiences}/${idea.id}/keen`);
await call('PUT', `${experiences}/${idea.id}/keen`);
// They went: Mara, who shared it, says "We did this", and it is something the group did.
await call('POST', `${experiences}/${idea.id}/done`);
await call('GET', `${experiences}?filter=all`);
await call('GET', `${experiences}?filter=did`);

// Deleting the account: while Lakeside Weekend is still active, Mara reads what deleting her
// account would wrap up (journey 19).
await call('GET', '/api/account/deletion-impact');

// Mara mutes Lakeside Weekend before it wraps up; no Worker runs, so nothing else changes (L2-158).
await call('PUT', `/api/me/notifications/popkins/${created.id}`, { level: 'Muted' });
// She looks for someone to mute, mutes Walt, then unmutes him (L2-160).
await call('GET', '/api/me/notifications/mute-candidates?q=');
const mute = await call('POST', '/api/me/notifications/mutes', { membershipId: waltsId });
await call('DELETE', `/api/me/notifications/mutes/${mute.muteId}`);

// Wrap up: Mara reads what the wrap-up screen says, wraps Lakeside Weekend up keeping its album,
// reads the recap and asks for the album as a zip (journey 9). It comes last: every answer
// above is of a Popkin that is still open. No Worker runs beside the recording, so the zip is
// still being prepared.
await call('GET', `/api/popkins/${created.id}/wrap-up`);
await call('POST', `/api/popkins/${created.id}/wrap-up`, { keepPhotos: true });
await call('GET', `/api/popkins/${created.id}/recap`);
const zip = await call('POST', `/api/popkins/${created.id}/recap/album-exports`);
await call('GET', `/api/popkins/${created.id}/recap/album-exports/${zip.id}`);

// Leave a Popkin: Dev leaves Lakeside Weekend (journey 18). It comes after the recap, so
// every answer above counts him; only his leave is recorded.
person = dev;
dev.record = true;
await call('DELETE', `/api/popkins/${created.id}/members/me`);

// The account: Mara gives her full name, reads her account, then saves a photo (journey 17).
// It comes after the wrap-up, so every answer above keeps the name she signed up with.
person = mara;
await call('PATCH', '/api/account', { name: 'Mara Okafor' });
await call('GET', '/api/account');
// Her notification settings, as she has never changed them (L2-154 AC1).
await call('GET', '/api/me/notifications');
// Then she changes them: group chat by email, the daily digest, and email off (L2-156, L2-157).
await call('PUT', '/api/me/notifications/kinds/GroupChat', { email: true });
await call('PUT', '/api/me/notifications/frequency', { frequency: 'DailyDigest' });
await call('PUT', '/api/me/notifications/email', { on: false });
const portrait = new FormData();
portrait.append(
  'photo',
  new Blob([readFileSync(join(mockImages, 'call1.jpg'))], { type: 'image/jpeg' }),
  'call1.jpg',
);
await call('PUT', '/api/account/photo', portrait);

// Today (L2-125, known gaps 99 and 111 ruled): Mara's day on the morning of the mocks.
await call('GET', '/api/contacts/today?on=2026-09-15');
// Reminders (L2-140, known gaps 104 and 114 ruled): every Contacts page reads them, none yet as
// the Worker has not run, and saves the device's zone.
await call('GET', '/api/contacts/reminders');
await call('PUT', '/api/me/time-zone', { zone: 'Europe/London' });
// Import (L2-151, known gaps 110 and 117 ruled): who she shares a Popkin with and does not keep
// yet; she imports Walt, once, and a resend imports no one more.
const candidates = await call('GET', '/api/contacts/import');
const waltToImport = candidates.popkins
  .flatMap((p: { people: { personId: string; name: string }[] }) => p.people)
  .find((p: { name: string }) => p.name === 'Walt Brennan');
const importWalt = {
  clientId: '00000000-0000-4000-c000-000000000080',
  personIds: [waltToImport.personId],
};
await call('POST', '/api/contacts/import', importWalt);

// Signing out ends the session it is sent with, so Joel's is the one recorded; then Mara deletes
// her account, which ends hers. Both come last.
person = joel;
await call('POST', '/api/auth/sign-out');
person = mara;
await call('DELETE', '/api/account');

// The admin app (ADR 0024): Lena Fischer, the first Owner (Admin:FirstOwner in
// eng/Start-E2eApi.ps1), signs in to the console with a code and adds the admins of the mocks.
person = { cookie: '', record: true };
const adminCode = await call('POST', '/api/admin/auth/codes', { email: 'lena.fischer@popkin.app' });
await call('POST', `/api/admin/auth/codes/${adminCode.verificationId}/confirm`, { code: '482913' });
await call('GET', '/api/admin/me');
await call('GET', '/api/admin/waiting');
await call('POST', '/api/admin/admins', { email: 'kwame.mensah@popkin.app', role: 'Support' });
await call('POST', '/api/admin/admins', { email: 'marco.bianchi@popkin.app', role: 'Viewer' });
const aiko = await call('POST', '/api/admin/admins', {
  email: 'aiko.tanaka@popkin.app',
  role: 'Support',
});
await call('GET', '/api/admin/roles');
const admins = await call('GET', '/api/admin/admins');
await call('GET', '/api/admin/audit');
// Features (L2-076): Plan off and Schedules on for everyone, as the seed leaves them; no live
// Popkin matches "lake" now Lakeside Weekend has wrapped up.
await call('GET', '/api/admin/features');
await call('GET', '/api/admin/features/Schedules/popkins/search?q=lake');
// Then she makes Aiko a Viewer and removes Marco; the list and the log above stay as they were.
await call('PUT', `/api/admin/admins/${aiko.id}/role`, {
  role: 'Viewer',
  reason: 'Moved to finance',
});
const marco = admins.admins.find((admin: { name: string }) => admin.name === 'Marco Bianchi');
await call('POST', `/api/admin/admins/${marco.id}/remove`, { reason: null });
// Last, she turns Schedules off; the page above stays as it was.
await call('PUT', '/api/admin/features/Schedules', {
  mode: 'Off',
  reason: 'Sync bug on Android 3.4.0',
});

const file = join(import.meta.dirname, '..', 'fixtures', 'api', 'responses.json');
writeFileSync(file, `${JSON.stringify(recorded, null, 2)}\n`);
console.log(`Recorded ${Object.keys(recorded).length} answers into ${file}`);
