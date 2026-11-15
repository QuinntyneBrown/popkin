import type { Page } from '@playwright/test';
import { parity } from '../../fixtures/parity';
import { theMockThisWeek } from '../../fixtures/schedule';
import { MyHoursDialog } from '../../pages/my-hours.dialog';
import { ThisWeekPage } from '../../pages/this-week.page';

const row = (index: number) => (page: Page) => new MyHoursDialog(page).rows.nth(index);
const openTheDialog = (page: Page) => new ThisWeekPage(page).myHours.click();

/** Mara's Thursday ends before it starts (L2-074 AC8). */
async function anEndBeforeTheStart(page: Page): Promise<void> {
  await openTheDialog(page);
  const dialog = new MyHoursDialog(page);
  await dialog.field('Thursday', 'start').fill('09:00');
  await dialog.field('Thursday', 'end').fill('08:00');
}

parity('hours-row', [
  // Saturday, not working: both fields blank.
  { key: 'myHours', name: 'blank', region: row(0), before: theMockThisWeek, app: openTheDialog },
  // Tuesday, 9 am to 5:30 pm.
  { key: 'myHours', name: 'filled', region: row(3), before: theMockThisWeek, app: openTheDialog },
  // Thursday's end before its start, and what it says.
  {
    key: 'myHoursInvalid',
    name: 'invalid',
    region: (page) => new MyHoursDialog(page).errors,
    before: theMockThisWeek,
    app: anEndBeforeTheStart,
  },
]);
