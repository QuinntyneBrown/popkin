import type { Page } from '@playwright/test';
import { contactsMorning } from '../../fixtures/contacts';
import { marasToday } from '../../fixtures/today';

/** Today on the morning of the mocks, as default.html draws it. */
export async function todayAsDrawn(page: Page): Promise<void> {
  await page.clock.install({ time: contactsMorning });
  await marasToday(page);
}
