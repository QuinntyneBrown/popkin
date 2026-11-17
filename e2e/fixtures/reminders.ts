import type { Page } from '@playwright/test';
import { recordedContactId } from './contacts';
import { answer } from './stubs';

export const remindersKey = 'GET /api/contacts/reminders';

/** A reminder of Chidi's, whose profile the recording holds. */
export function chidisReminder(): object {
  return {
    id: 'a1b2c3d4-0000-4000-8000-000000000001',
    kind: 'KeyDate',
    contactId: recordedContactId('Chidi Okafor'),
    firstName: 'Chidi',
    words: 'Chidi’s anniversary on 26 September',
    dueOn: '2026-09-26',
  };
}

/** Grace's birthday, as the info toast draws it. */
export function gracesReminder(): object {
  return {
    ...chidisReminder(),
    id: 'a1b2c3d4-0000-4000-8000-000000000002',
    firstName: 'Grace',
    words: 'Grace turns 33 on Saturday',
  };
}

/** Mara's reminders, answered when any Contacts page opens; dismissing one answers 204. */
export async function marasReminders(page: Page, reminders: object[]): Promise<void> {
  await answer(page, remindersKey, { status: 200, body: reminders });
  await page.route('**/api/contacts/reminders/*/dismissal', (route) =>
    route.request().method() === 'POST' ? route.fulfill({ status: 204 }) : route.fallback(),
  );
}
