// Acceptance Test
// Traces to: L2-072 AC2, L2-074 AC8, L2-045
// Description: the Schedule of a wrapped-up Popkin is read-only: time off and this week still
// show, with no "Add my time off" and no "My hours".
import { expect, test } from '../fixtures/pk-test';
import {
  maraThisWeek,
  maraWithASchedule,
  mocksWeek,
  theMocksHours,
  theMocksTimeOff,
  thisWeekUrl,
  timeOffUrl,
} from '../fixtures/schedule';
import { ThisWeekPage } from '../pages/this-week.page';
import { TimeOffPage } from '../pages/time-off.page';

test.describe('the Schedule of a wrapped-up Popkin', () => {
  test('shows time off with no way to add any', async ({ page }) => {
    await maraWithASchedule(page, (schedule, home) => {
      theMocksTimeOff(schedule);
      schedule.canEdit = false;
      home.popkin.status = 'WrappedUp';
    });
    await page.goto(timeOffUrl(mocksWeek));
    const timeOff = new TimeOffPage(page);

    await expect(timeOff.names).toHaveCount(6);
    await expect(timeOff.addMyTimeOff).toHaveCount(0);
  });

  test('shows this week with no way to enter hours', async ({ page }) => {
    await maraThisWeek(page, (schedule) => {
      theMocksHours(schedule);
      schedule.canEdit = false;
    });
    await page.goto(thisWeekUrl);
    const thisWeek = new ThisWeekPage(page);

    await expect(thisWeek.days).toHaveCount(7);
    await expect(thisWeek.myHours).toHaveCount(0);
  });
});
