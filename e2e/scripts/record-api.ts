/**
 * Records the API's answers into fixtures/api/responses.json (ADR 0005). Run it against the local
 * API (`pwsh eng/Start-E2eApi.ps1`) when an endpoint's answer changes, and commit the result in
 * the same change. It is maintenance, never part of a test run.
 *
 * The journey below is the cast of the mocks: Mara signs up and starts Lakeside Weekend, Walt
 * and Dev join it, Joel opens its invite and joins, Walt and Mara write in the Everyone
 * thread, Mara opens the Popkin's home, and she adds the album's first photo. Each answer is keyed
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

async function call(method: string, path: string, body?: unknown) {
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
  if (person.record) {
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

// Popkins: Mara starts Lakeside Weekend, Teal, for the weekend (Sunday at 6 pm).
const sunday = new Date();
sunday.setDate(sunday.getDate() + ((7 - sunday.getDay()) % 7 || 7));
sunday.setHours(18, 0, 0, 0);
const created = await call('POST', '/api/popkins', {
  name: 'Lakeside Weekend',
  emoji: '🏕️',
  colour: 'Teal',
  length: 'TheWeekend',
  endsAt: sunday.toISOString(),
});
await call('GET', `/api/popkins/${created.id}/invite`);

// Invitations: Walt and Dev join, then Joel opens the invite as a visitor, signs up and joins.
const invite = `/api/invites/${created.inviteCode}`;
const walt = await signUp('Walt Brennan', '(415) 555-0177');
await call('POST', `${invite}/join`, joinForm('Walt Brennan'));
await signUp('Dev Patel', '(415) 555-0162');
await call('POST', `${invite}/join`, joinForm('Dev Patel'));
person = { cookie: '', record: true };
await call('GET', invite);
await signUp('Joel', '(415) 555-0123', true);
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

// The Popkin home: Mara reads the header and its four sections. Photos and experiences are
// empty until their journeys.
await call('GET', `/api/popkins/${created.id}`);
await call('GET', `/api/popkins/${created.id}/threads/everyone/preview`);
await call('GET', `/api/popkins/${created.id}/photos/summary`);
await call('GET', `/api/popkins/${created.id}/experiences/summary`);
await call('GET', `/api/popkins/${created.id}/members`);

// My Popkins: Mara's one active Popkin, as its card (journey 6).
await call('GET', '/api/popkins');

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

const file = join(import.meta.dirname, '..', 'fixtures', 'api', 'responses.json');
writeFileSync(file, `${JSON.stringify(recorded, null, 2)}\n`);
console.log(`Recorded ${Object.keys(recorded).length} answers into ${file}`);
