// Acceptance Test
// Traces to: L2-077 AC1, AC2, AC4, AC5
// Description: while Schedules is off, time off and this week opened by their address say
// "Schedules is switched off" and offer "Back to {Popkin name}", showing nothing of the feature;
// an open screen turns to that within a minute, and back to what it held once the feature is on
// again.
import { homeOf, homeUrl } from '../fixtures/home';
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
import { PopkinHomePage } from '../pages/popkin-home.page';
import { ThisWeekPage } from '../pages/this-week.page';
import { TimeOffPage } from '../pages/time-off.page';

const offText =
  'Popkin has turned this feature off for now. Nothing is lost: it comes back as it was when the feature is on again. Your host can ask Popkin to find out more.';

test.describe('Schedules switched off', () => {
  // L2-077 AC2
  test('time off opened by its address says so, shows no time off, and goes back home', async ({
    page,
  }) => {
    const schedule = await maraWithASchedule(page, theMocksTimeOff);
    schedule.fail('off');
    await page.goto(timeOffUrl(mocksWeek));
    const timeOff = new TimeOffPage(page);

    await expect(timeOff.off).toBeVisible();
    await expect(timeOff.offText).toHaveText(offText);
    await expect(timeOff.table).toHaveCount(0);
    await expect(timeOff.addMyTimeOff).toHaveCount(0);
    await timeOff.backToPopkin.click();

    await expect(new PopkinHomePage(page).root).toBeVisible();
    await expect(page).toHaveURL(homeUrl);
  });

  // L2-077 AC2
  test('this week opened by its address says so and names the Popkin to go back to', async ({
    page,
  }) => {
    const schedule = await maraThisWeek(page, theMocksHours);
    schedule.fail('off');
    await page.goto(thisWeekUrl);
    const thisWeek = new ThisWeekPage(page);

    await expect(thisWeek.off).toBeVisible();
    await expect(thisWeek.backToPopkin).toHaveText('Back to Cabin Week ’27');
    await expect(thisWeek.days).toHaveCount(0);
    await expect(thisWeek.myHours).toHaveCount(0);
  });

  // L2-077 AC1, AC4: the tabs follow the switch, read every minute, with no reload.
  test('an open screen loses the Schedule tab within a minute of Schedules going off', async ({
    page,
  }) => {
    const schedule = await maraWithASchedule(page, theMocksTimeOff);
    await page.goto(timeOffUrl(mocksWeek));
    const timeOff = new TimeOffPage(page);
    await expect(timeOff.scheduleTab).toBeVisible();

    homeOf(page).popkin.schedules = false;
    schedule.fail('off');
    await page.clock.runFor(60_000);

    await expect(timeOff.off).toBeVisible();
    await expect(timeOff.scheduleTab).toHaveCount(0);
  });

  // L2-077 AC4, AC5
  test('an open screen turns to it within a minute, and back once it is on again', async ({
    page,
  }) => {
    const schedule = await maraWithASchedule(page, theMocksTimeOff);
    await page.goto(timeOffUrl(mocksWeek));
    const timeOff = new TimeOffPage(page);
    await expect(timeOff.names).toHaveCount(6);

    schedule.fail('off');
    await page.clock.runFor(60_000);

    await expect(timeOff.off).toBeVisible();
    await expect(timeOff.table).toHaveCount(0);

    schedule.recover();
    await page.clock.runFor(60_000);

    await expect(timeOff.off).toHaveCount(0);
    await expect(timeOff.cellsOf('Dev')).toHaveText([
      'Tentative',
      'Tentative',
      'Tentative',
      'Tentative',
      'Tentative',
      '',
      '',
    ]);
  });
});
