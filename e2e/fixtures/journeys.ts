import type { Page } from '@playwright/test';
import responses from './api/responses.json';
import { VerifyCodePage } from '../pages/verify-code.page';

/**
 * Brings the app to states the recorded journey reaches, for specs and parity cases that start
 * part-way through it. Each step drives the screens; nothing is injected.
 */
const sent = responses['POST /api/auth/codes'].body;

/** When the recorded code was sent: 30 seconds before a new one may be asked for. */
export const codeSentAt = new Date(new Date(sent.resendAvailableAt).getTime() - 30_000);

/** The code screen, six seconds after the code was sent ("Send a new code in 0:24"). */
export async function codeScreenAt24Seconds(page: Page): Promise<void> {
  await page.clock.install({ time: codeSentAt });
  await new VerifyCodePage(page).reach();
  await page.clock.runFor(6_000);
}
