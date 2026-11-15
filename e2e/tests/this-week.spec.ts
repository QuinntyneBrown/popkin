// Acceptance Test
// Traces to: L2-074 AC1, AC2, AC3, AC4, AC5, AC6, AC9, AC10, L2-056
// Description: this week shows seven days from today, how many are free each evening, the
// chosen evening's headline and the timeline of who is working; it loads, fails and recovers.
import {
  maraThisWeek,
  scheduleOf,
  theMocksHours,
  thisWeekDayUrl,
  thisWeekUrl,
  timeOffUrl,
  mocksWeek,
  maraWithASchedule,
  weeksAsked,
} from '../fixtures/schedule';
import { expect, test } from '../fixtures/pk-test';
import { ThisWeekPage } from '../pages/this-week.page';
import { TimeOffPage } from '../pages/time-off.page';

test.describe('This week', () => {
  // L2-074 AC1, AC2
  test('opens from Time off on seven days from today, today chosen, each with who is free', async ({
    page,
  }) => {
    await maraThisWeek(page, theMocksHours);
    await page.goto(timeOffUrl(mocksWeek));
    await new TimeOffPage(page).views.getByRole('link', { name: 'This week' }).click();
    const thisWeek = new ThisWeekPage(page);

    await expect(thisWeek.root).toBeAttached();
    await expect(page).toHaveURL(thisWeekUrl);
    await expect(thisWeek.heading).toHaveText('This week');
    await expect(thisWeek.subtitle).toHaveText('Sep 12 – 18 · everyone’s working hours');
    await expect(thisWeek.currentView).toHaveText('This week');
    await expect(thisWeek.currentTab).toHaveText('Schedule');
    await expect(thisWeek.days).toHaveText([
      /Sat\s*12\s*4\/6 free/,
      /Sun\s*13\s*4\/6 free/,
      /Mon\s*14\s*5\/6 free/,
      /Tue\s*15\s*3\/6 free/,
      /Wed\s*16\s*6\/6 free/,
      /Thu\s*17\s*4\/6 free/,
      /Fri\s*18\s*5\/6 free/,
    ]);
    await expect(thisWeek.pressedDay).toHaveText(/Sat\s*12/);
    await expect(thisWeek.note).toHaveText('Free means not working between 8 and 11 pm.');
    expect(weeksAsked(scheduleOf(page).weeksFrom)).toEqual(['2026-09-12']);
  });

  // L2-074 AC3, AC5, AC6
  test('names when everyone is free on the chosen evening, and who is last off shift', async ({
    page,
  }) => {
    await maraThisWeek(page, theMocksHours);
    await page.goto(thisWeekUrl);
    const thisWeek = new ThisWeekPage(page);

    await thisWeek.day('Wed 16').click();

    await expect(page).toHaveURL(thisWeekDayUrl('2026-09-16'));
    await expect(thisWeek.pressedDay).toHaveText(/Wed\s*16/);
    await expect(thisWeek.headline).toHaveText('Wednesday, everyone’s free from 7:30 pm.');
    await expect(thisWeek.headlineTime).toHaveText('7:30 pm.');
    await expect(thisWeek.sentence).toHaveText(
      'Ellie is the last off shift. The only evening this week all six of you are around.',
    );
    await expect(thisWeek.chatAction).toHaveText('Plan dinner in chat');
    await expect(thisWeek.shifts).toHaveAccessibleName('Who is working on Wednesday');
    await expect(thisWeek.ticks).toHaveText(['12 pm', '3 pm', '6 pm', '9 pm', 'Midnight']);
    await expect(thisWeek.names).toHaveText(['Mara', 'Walt', 'Dev', 'Ellie', 'Sam', 'Priya']);
    await expect(thisWeek.blocksOf('Ellie')).toHaveText(['Working till 7:30 pm']);
    await expect(thisWeek.tint).toHaveCount(6);
    await expect(thisWeek.legend).toHaveText(/At work\s*All six free from\s*7:30 pm/);
    await expect(thisWeek.shiftsText).toHaveText(
      'Mara: working 9 am to 5:30 pm; Walt: working 11 am to 7 pm; Dev: working 7 am to 3:30 pm; Ellie: working 7 am to 7:30 pm; Sam: working 10 am to 5 pm; Priya: working 8:30 am to 5 pm.',
    );
    expect(weeksAsked(scheduleOf(page).weeksFrom)).toEqual(['2026-09-12']);
  });

  // L2-074 AC4, AC5
  test('counts who is free on an evening someone works, and names who is working', async ({
    page,
  }) => {
    await maraThisWeek(page, theMocksHours);
    await page.goto(thisWeekDayUrl('2026-09-15'));
    const thisWeek = new ThisWeekPage(page);

    await expect(thisWeek.headline).toHaveText('Tuesday, 3 of 6 are free in the evening.');
    await expect(thisWeek.headlineTime).toHaveCount(0);
    await expect(thisWeek.sentence).toHaveText(
      'Dev, Ellie and Sam are working. Wednesday is the one evening everyone is free.',
    );
    await expect(thisWeek.chatAction).toHaveText('Ask in chat anyway');
    await expect(thisWeek.blocksOf('Ellie')).toHaveText(['Working']);
    await expect(thisWeek.blocksOf('Walt')).toHaveCount(0);
    await expect(thisWeek.tint).toHaveCount(0);
    await expect(thisWeek.legend).toHaveText('At work');
  });

  // L2-074 AC9
  test('says nobody has added their hours yet, with everyone free every day and no timeline', async ({
    page,
  }) => {
    await maraThisWeek(page);
    await page.goto(thisWeekUrl);
    const thisWeek = new ThisWeekPage(page);

    await expect(thisWeek.days).toHaveText(Array(7).fill(/6\/6 free/));
    await expect(thisWeek.headline).toHaveText('Nobody has added their hours yet.');
    await expect(thisWeek.sentence).toHaveText(
      'Each of you adds your own working hours; this week finds the evening everyone is free. Add yours to get it started.',
    );
    await expect(thisWeek.shifts).toHaveCount(0);
  });

  // L2-074 AC10
  test('puts the chat action beside the headline from 1024 px, and under it narrower', async ({
    page,
  }) => {
    await maraThisWeek(page, theMocksHours);
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto(thisWeekDayUrl('2026-09-16'));
    const thisWeek = new ThisWeekPage(page);
    await expect(thisWeek.chatAction).toBeVisible();

    const wide = {
      headline: await thisWeek.headline.boundingBox(),
      action: await thisWeek.chatAction.boundingBox(),
    };
    expect(wide.action!.x).toBeGreaterThanOrEqual(wide.headline!.x + wide.headline!.width);

    await page.setViewportSize({ width: 360, height: 800 });
    await expect
      .poll(async () => {
        const headline = await thisWeek.sentence.boundingBox();
        const action = await thisWeek.chatAction.boundingBox();
        return action!.y >= headline!.y + headline!.height;
      })
      .toBe(true);
  });

  // L2-074 AC2: every day is reachable by keyboard.
  test('chooses a day with the keyboard', async ({ page }) => {
    await maraThisWeek(page, theMocksHours);
    await page.goto(thisWeekUrl);
    const thisWeek = new ThisWeekPage(page);

    await thisWeek.day('Wed 16').focus();
    await page.keyboard.press('Enter');

    await expect(thisWeek.pressedDay).toHaveText(/Wed\s*16/);
  });

  // L2-056 AC1, AC2
  test('says it is loading, then fails with a way to try again', async ({ page, hub }) => {
    const schedule = await maraThisWeek(page, theMocksHours);
    const release = schedule.hold();
    await page.goto(thisWeekUrl);
    const thisWeek = new ThisWeekPage(page);

    await expect(thisWeek.loading).toBeAttached();
    // Both the first read and the one once the hub connects fail; then nothing replaces the error.
    await hub.connected();
    await expect.poll(() => schedule.reads).toBe(2);
    schedule.fail();
    release();
    await expect(thisWeek.error).toBeVisible();

    schedule.recover();
    await thisWeek.tryAgain.click();

    await expect(thisWeek.days).toHaveCount(7);
  });

  // The two views of the Schedule link to each other.
  test('goes back to Time off', async ({ page }) => {
    await maraWithASchedule(page);
    await page.goto(thisWeekUrl);
    const thisWeek = new ThisWeekPage(page);

    await thisWeek.timeOffView.click();

    await expect(new TimeOffPage(page).root).toBeAttached();
  });
});
