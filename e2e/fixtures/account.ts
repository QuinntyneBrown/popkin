import path from 'node:path';
import type { Page } from '@playwright/test';
import responses from './api/responses.json';
import { answer, answerOnce, hold, problem } from './stubs';

const account = responses['GET /api/account'].body;
const call1 = path.join(__dirname, '../../docs/mocks/assets/images/call1.jpg');

/** Mara's account as the mocks draw it: her photograph, her name and her number. */
export async function theMockAccount(page: Page): Promise<void> {
  await answer(page, 'GET /api/account', {
    status: 200,
    body: { ...account, photoUrl: '/photos/mara.jpg' },
  });
  await page.route('**/photos/mara.jpg', (route) => route.fulfill({ path: call1 }));
}

/** The account held in flight: the loading state (L2-056 AC1). */
export async function theAccountLoading(page: Page): Promise<() => void> {
  return hold(page, 'GET /api/account');
}

/** The account cannot be read: the error state (L2-056 AC2). */
export async function theAccountFailing(page: Page): Promise<void> {
  await answer(page, 'GET /api/account', problem(500, 'unexpected'));
}

/** The account fails once, then loads: "Try again". */
export async function theAccountFailingOnce(page: Page): Promise<void> {
  await answerOnce(page, 'GET /api/account', problem(500, 'unexpected'));
}

/** Walt, who signs in with an email. */
export async function anAccountWithEmail(page: Page): Promise<void> {
  await answer(page, 'GET /api/account', {
    status: 200,
    body: { ...account, name: 'Walt Brennan', channel: 'Email', destination: 'walt@example.com' },
  });
}

/** Mara's account without a photo, as the recording has it: her initials. */
export async function anAccountWithoutAPhoto(page: Page): Promise<void> {
  await answer(page, 'GET /api/account', { status: 200, body: account });
}

/** Saving the name answers with `name` and Mara's photograph, as the API does. */
export async function savedAs(page: Page, name: string): Promise<void> {
  await answer(page, 'PATCH /api/account', {
    status: 200,
    body: { ...account, name, photoUrl: '/photos/mara.jpg' },
  });
  await page.route('**/photos/mara.jpg', (route) => route.fulfill({ path: call1 }));
}

/** Saving a photo answers with one the suite can show. */
export async function savedWithAPhoto(page: Page): Promise<void> {
  await answer(page, 'PUT /api/account/photo', {
    status: 200,
    body: { ...account, photoUrl: '/photos/mara.jpg' },
  });
  await page.route('**/photos/mara.jpg', (route) => route.fulfill({ path: call1 }));
}

/** Mara hosts the two active Popkins the mocks name (L2-049 AC3). */
export async function hostingTwoPopkins(page: Page): Promise<void> {
  const impact = responses['GET /api/account/deletion-impact'].body;
  const lakeside = impact.hostedActivePopkins[0];
  await answer(page, 'GET /api/account/deletion-impact', {
    status: 200,
    body: {
      hostedActivePopkins: [
        lakeside,
        {
          popkinId: '00000000-0000-4000-c000-000000000001',
          name: 'Thursday Night Group',
          emoji: '🎉',
        },
      ],
    },
  });
}

/** Mara hosts no active Popkin. */
export async function hostingNothing(page: Page): Promise<void> {
  await answer(page, 'GET /api/account/deletion-impact', {
    status: 200,
    body: { hostedActivePopkins: [] },
  });
}
