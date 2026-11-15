// Acceptance Test
// Traces to: L2-072 AC1, AC2, AC3, AC4, AC7, AC8, AC9, AC10, L2-058
// Description: time off shows a week of the group's days, a row per member and a column per
// day; every weekday is Working until a member says otherwise; it loads, fails and recovers.
import { people } from '../fixtures/chat';
import { homeUrl } from '../fixtures/home';
import {
  maraWithASchedule,
  theMocksTimeOff,
  mocksWeek,
  scheduleOf,
  scheduleUrl,
  timeOffUrl,
} from '../fixtures/schedule';
import { expect, test } from '../fixtures/pk-test';
import { PopkinHomePage } from '../pages/popkin-home.page';
import { TimeOffPage } from '../pages/time-off.page';

test.describe('Time off', () => {
  // L2-072 AC1, AC2
  test('opens from the Schedule tab on the current week, a row per member and a column per day', async ({
    page,
  }) => {
    await maraWithASchedule(page);
    await page.goto(homeUrl);
    await new PopkinHomePage(page).scheduleTab.click();
    const timeOff = new TimeOffPage(page);

    await expect(timeOff.root).toBeAttached();
    await expect(page).toHaveURL(scheduleUrl);
    await expect(timeOff.heading).toBeVisible();
    await expect(timeOff.currentView).toHaveText('Time off');
    await expect(timeOff.currentTab).toHaveText('Schedule');
    await expect(timeOff.caption).toHaveText('Who is off each day of Feb 15 – 21');
    await expect(timeOff.days).toHaveText([
      /Mon\s*15/,
      /Tue\s*16/,
      /Wed\s*17/,
      /Thu\s*18/,
      /Fri\s*19/,
      /Sat\s*20/,
      /Sun\s*21/,
    ]);
    await expect(timeOff.names).toHaveText(['Mara', 'Walt', 'Dev', 'Ellie', 'Sam', 'Priya']);
    expect(scheduleOf(page).asked).toEqual([mocksWeek]);
  });

  // L2-072 AC2, AC4, AC10
  test('says nobody has added time off yet, with every weekday Working and nobody off', async ({
    page,
  }) => {
    await maraWithASchedule(page);
    await page.goto(timeOffUrl(mocksWeek));
    const timeOff = new TimeOffPage(page);

    await expect(timeOff.nobodyYet).toBeVisible();
    await expect(timeOff.cellsOf('Mara')).toHaveText([
      'Working',
      'Working',
      'Working',
      'Working',
      'Working',
      '',
      '',
    ]);
    await expect(timeOff.cellsOf('Mara').nth(5)).toHaveAccessibleName('Weekend');
    await expect(timeOff.counts.first()).toHaveText('0 of 6 off');
    await expect(timeOff.boldCounts).toHaveCount(0);
  });

  // L2-072 AC2, AC4
  test('shows who is off and tentative, and counts who is off each day', async ({ page }) => {
    await maraWithASchedule(page, (schedule) => {
      schedule.off(people.mara.membershipId, ['2027-02-15', '2027-02-16']);
      schedule.off(people.dev.membershipId, ['2027-02-16'], 'Tentative');
    });
    await page.goto(timeOffUrl(mocksWeek));
    const timeOff = new TimeOffPage(page);

    await expect(timeOff.cellsOf('Mara')).toHaveText([
      'Off',
      'Off',
      'Working',
      'Working',
      'Working',
      '',
      '',
    ]);
    await expect(timeOff.cellsOf('Dev')).toHaveText([
      'Working',
      'Tentative',
      'Working',
      'Working',
      'Working',
      '',
      '',
    ]);
    await expect(timeOff.counts).toHaveText([
      '1 of 6 off',
      '1 of 6 off',
      '0 of 6 off',
      '0 of 6 off',
      '0 of 6 off',
      '–',
      '–',
    ]);
    await expect(timeOff.nobodyYet).toHaveCount(0);
    await expect(timeOff.legend).toHaveText(/Off\s*Tentative\s*Working/);
  });

  test('says it is loading, then that it could not load, and loads again on Try again', async ({
    page,
  }) => {
    const schedule = await maraWithASchedule(page);
    const release = schedule.hold();
    schedule.fail();
    await page.goto(timeOffUrl(mocksWeek));
    const timeOff = new TimeOffPage(page);

    await expect(timeOff.loading).toBeAttached();
    release();
    await expect(timeOff.error).toBeVisible();
    schedule.recover();
    await timeOff.tryAgain.click();
    await expect(timeOff.names).toHaveCount(6);
  });

  // L2-072 AC9
  test.describe('on a phone', () => {
    test.use({ viewport: { width: 360, height: 800 } });

    test('scrolls the table inside the screen, the page itself does not scroll sideways', async ({
      page,
    }) => {
      await maraWithASchedule(page);
      await page.goto(timeOffUrl(mocksWeek));
      const timeOff = new TimeOffPage(page);
      await expect(timeOff.names).toHaveCount(6);

      const wrap = await timeOff.tableWrap.evaluate((el) => ({
        scroll: el.scrollWidth,
        client: el.clientWidth,
      }));
      expect(wrap.scroll).toBeGreaterThan(wrap.client);
      const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(pageWidth).toBeLessThanOrEqual(360);
    });
  });

  // L2-072 AC3, AC8
  test('opens on the event’s week, the month’s weeks as chips, the event’s week marked', async ({
    page,
  }) => {
    const schedule = await maraWithASchedule(page, theMocksTimeOff);
    await page.goto(scheduleUrl);
    const timeOff = new TimeOffPage(page);

    await expect(timeOff.month).toHaveText('February');
    await expect(timeOff.year).toHaveText('2027');
    await expect(timeOff.weekChips).toHaveText([
      'Feb 1 – 7',
      'Feb 8 – 14',
      'Feb 15 – 21',
      'Feb 22 – 28',
    ]);
    await expect(timeOff.pressedWeek).toHaveText('Feb 15 – 21');
    await expect(timeOff.eventDot).toHaveCount(1);
    await expect(timeOff.weekChips.nth(2)).toContainText('Feb 15 – 21');
    await expect(
      timeOff.weekChips.nth(2).getByRole('img', { name: 'Event this week' }),
    ).toBeVisible();
    await expect(timeOff.goToEvent).toHaveCount(0);
    expect(schedule.asked).toEqual([mocksWeek]);
  });

  // L2-072 AC3, AC7
  test('moves a week and a month at a time, and "Go to" returns to the event', async ({ page }) => {
    await maraWithASchedule(page, theMocksTimeOff);
    await page.goto(timeOffUrl(mocksWeek));
    const timeOff = new TimeOffPage(page);

    await timeOff.nextWeek.click();
    await expect(page).toHaveURL(timeOffUrl('2027-02-22'));
    await expect(timeOff.pressedWeek).toHaveText('Feb 22 – 28');
    await expect(timeOff.caption).toHaveText('Who is off each day of Feb 22 – 28');

    await timeOff.nextMonth.click();
    await expect(timeOff.month).toHaveText('March');
    await expect(timeOff.pressedWeek).toHaveText('Mar 1 – 7');

    await timeOff.previousMonth.click();
    await timeOff.previousMonth.click();
    await expect(timeOff.month).toHaveText('January');
    await expect(timeOff.pressedWeek).toHaveText('Jan 4 – 10');

    await timeOff.weekChips.filter({ hasText: 'Jan 25 – 31' }).click();
    await expect(timeOff.pressedWeek).toHaveText('Jan 25 – 31');
    await timeOff.previousWeek.click();
    await expect(timeOff.pressedWeek).toHaveText('Jan 18 – 24');

    await expect(timeOff.goToEvent).toHaveText('Go to Cabin week');
    await timeOff.goToEvent.click();
    await expect(page).toHaveURL(timeOffUrl(mocksWeek));
    await expect(timeOff.pressedWeek).toHaveText('Feb 15 – 21');
    await expect(timeOff.goToEvent).toHaveCount(0);
  });
});
