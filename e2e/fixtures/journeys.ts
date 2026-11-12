import type { Page } from '@playwright/test';
import responses from './api/responses.json';
import { NameYourPopkinPage } from '../pages/name-your-popkin.page';
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

/** Saturday 12 September 2026, noon on the device: the day the mocks show. */
export const mockToday = new Date(2026, 8, 12, 12, 0, 0);

/** How long, after naming Lakeside Weekend, with the device clock on the mocks' day. */
export async function howLongForLakeside(page: Page, today = mockToday): Promise<void> {
  await page.clock.install({ time: today });
  await page.goto('/new');
  const step = new NameYourPopkinPage(page);
  await step.chooseLakeside();
  await step.looksGood.click();
  await page.locator('body[data-page="how-long"]').waitFor();
}
