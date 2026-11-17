import type { Page } from '@playwright/test';
import responses from './api/responses.json';
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
