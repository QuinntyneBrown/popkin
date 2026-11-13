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
