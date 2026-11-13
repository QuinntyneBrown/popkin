/**
 * Records the API's answers into fixtures/api/responses.json (ADR 0005). Run it against the local
 * API (`pwsh eng/Start-E2eApi.ps1`) when an endpoint's answer changes, and commit the result in
 * the same change. It is maintenance, never part of a test run.
 *
 * The journey below is the cast of the mocks: Mara signs up and starts Lakeside Weekend, Walt
 * and Dev join it, and Joel opens its invite and joins. Each answer is keyed
 * "METHOD /api/path?query", the key the e2e fixture looks up, so one answer is kept per key:
 * the accounts answers are Mara's, and the other people's sign-ups are not recorded.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const api = process.env['PK_API'] ?? 'http://localhost:5080';
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
await signUp('Walt Brennan', '(415) 555-0177');
await call('POST', `${invite}/join`, joinForm('Walt Brennan'));
await signUp('Dev Patel', '(415) 555-0162');
await call('POST', `${invite}/join`, joinForm('Dev Patel'));
person = { cookie: '', record: true };
await call('GET', invite);
await signUp('Joel', '(415) 555-0123', true);
await call('GET', `${invite}/members`);
await call('POST', `${invite}/join`, joinForm('Joel'));

const file = join(import.meta.dirname, '..', 'fixtures', 'api', 'responses.json');
writeFileSync(file, `${JSON.stringify(recorded, null, 2)}\n`);
console.log(`Recorded ${Object.keys(recorded).length} answers into ${file}`);
