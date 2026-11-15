// Acceptance Test
// Traces to: L2-074 AC8, AC9, L2-073 AC2, AC3
// Description: each member enters their own working hours for the seven days of this week, up
// to two stretches a day on the quarter hour; Save reads "Saving…", closes and this week shows
// them; a day that breaks a rule says so and cannot be saved; a failure keeps the hours.
import { people } from '../fixtures/chat';
import {
  maraThisWeek,
  scheduleOf,
  theMocksHours,
  thisWeekDayUrl,
  thisWeekUrl,
} from '../fixtures/schedule';
import { expect, test } from '../fixtures/pk-test';
import { MyHoursDialog } from '../pages/my-hours.dialog';
import { ThisWeekPage } from '../pages/this-week.page';

const none: { start: string; end: string }[] = [];

test.describe('My hours', () => {
  // L2-074 AC8
  test('opens on my hours for the seven days, a start and an end for each', async ({ page }) => {
    await maraThisWeek(page, theMocksHours);
    await page.goto(thisWeekUrl);
    await new ThisWeekPage(page).myHours.click();
    const dialog = new MyHoursDialog(page);

    await expect(dialog.heading).toBeVisible();
    await expect(dialog.description).toHaveText(
      'Your working hours, Sep 12 – 18. Leave a day blank if you’re not working. Times are on the quarter hour.',
    );
    await expect(dialog.days).toHaveText([
      'Sat 12',
      'Sun 13',
      'Mon 14',
      'Tue 15',
      'Wed 16',
      'Thu 17',
      'Fri 18',
    ]);
    await expect(dialog.field('Saturday', 'start')).toHaveValue('');
    await expect(dialog.field('Tuesday', 'start')).toHaveValue('09:00');
    await expect(dialog.field('Tuesday', 'end')).toHaveValue('17:30');
    await expect(dialog.field('Tuesday', 'start')).toHaveAttribute('step', '900');
  });

  // L2-074 AC8, L2-073 AC2
  test('saves my hours: "Saving…" while it goes, then it closes and this week shows them', async ({
    page,
  }) => {
    const schedule = await maraThisWeek(page, theMocksHours);
    await page.goto(thisWeekDayUrl('2026-09-17'));
    const thisWeek = new ThisWeekPage(page);
    await thisWeek.myHours.click();
    const dialog = new MyHoursDialog(page);
    await dialog.field('Thursday', 'start').fill('09:00');
    await dialog.field('Thursday', 'end').fill('19:00');
    const release = schedule.holdSaves();

    await dialog.save.click();

    await expect(dialog.save).toHaveText('Saving…');
    await expect(dialog.save).toBeDisabled();
    release();
    await expect(dialog.root).toHaveCount(0);
    await expect(thisWeek.blocksOf('Mara')).toHaveText(['Working till 7 pm']);
    expect(scheduleOf(page).hoursSaves).toEqual([
      {
        membershipId: people.mara.membershipId,
        from: '2026-09-12',
        days: [
          none,
          none,
          none,
          [{ start: '09:00', end: '17:30' }],
          [{ start: '09:00', end: '17:30' }],
          [{ start: '09:00', end: '19:00' }],
          none,
        ],
      },
    ]);
  });

  // L2-074 AC8: up to two stretches a day, the second to midnight.
  test('adds a second stretch to a day', async ({ page }) => {
    await maraThisWeek(page);
    await page.goto(thisWeekUrl);
    await new ThisWeekPage(page).myHours.click();
    const dialog = new MyHoursDialog(page);
    await dialog.field('Sunday', 'start').fill('06:00');
    await dialog.field('Sunday', 'end').fill('10:00');

    await dialog.addAnother('Sunday').click();
    await dialog.field('Sunday', 'start', true).fill('18:00');
    await dialog.field('Sunday', 'end', true).fill('00:00');
    await dialog.save.click();

    await expect(dialog.root).toHaveCount(0);
    expect(scheduleOf(page).hoursSaves[0].days[1]).toEqual([
      { start: '06:00', end: '10:00' },
      { start: '18:00', end: '24:00' },
    ]);
  });

  // L2-074 AC8
  test('says when a day ends before it starts, and cannot be saved', async ({ page }) => {
    await maraThisWeek(page, theMocksHours);
    await page.goto(thisWeekUrl);
    await new ThisWeekPage(page).myHours.click();
    const dialog = new MyHoursDialog(page);

    await dialog.field('Thursday', 'start').fill('09:00');
    await dialog.field('Thursday', 'end').fill('08:00');

    await expect(dialog.errors).toHaveText(['Thursday ends before it starts.']);
    await expect(dialog.field('Thursday', 'end')).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.field('Thursday', 'end')).toHaveAccessibleDescription(
      'Thursday ends before it starts.',
    );
    await expect(dialog.save).toBeDisabled();
    expect(scheduleOf(page).hoursSaves).toEqual([]);
  });

  // L2-073 AC3
  test('keeps my hours when saving fails, and saves them when I try again', async ({ page }) => {
    const schedule = await maraThisWeek(page);
    await page.goto(thisWeekUrl);
    await new ThisWeekPage(page).myHours.click();
    const dialog = new MyHoursDialog(page);
    await dialog.field('Friday', 'start').fill('09:00');
    await dialog.field('Friday', 'end').fill('16:00');
    schedule.failSaves();

    await dialog.save.click();

    await expect(dialog.alert).toHaveText(
      /We couldn’t save that\.\s*Your hours are still here\. Try again\./,
    );
    await expect(dialog.field('Friday', 'end')).toHaveValue('16:00');
    await expect(dialog.save).toBeEnabled();

    schedule.recover();
    await dialog.save.click();

    await expect(dialog.root).toHaveCount(0);
  });

  // L2-074 AC9
  test('is offered when nobody has added their hours yet', async ({ page }) => {
    await maraThisWeek(page);
    await page.goto(thisWeekUrl);
    const thisWeek = new ThisWeekPage(page);

    await thisWeek.freeMyHours.click();

    await expect(new MyHoursDialog(page).heading).toBeVisible();
  });
});
