// Acceptance Test
// Traces to: L2-073 AC1, AC2, AC3, AC5
// Description: each member adds their own time off for the week shown, Monday to Friday; Save
// reads "Saving…", closes and fills their row; a failure keeps the choices; a week more than a
// year ahead cannot be saved.
import { people } from '../fixtures/chat';
import { maraWithASchedule, mocksWeek, scheduleOf, timeOffUrl } from '../fixtures/schedule';
import { expect, test } from '../fixtures/pk-test';
import { AddTimeOffDialog } from '../pages/add-time-off.dialog';
import { TimeOffPage } from '../pages/time-off.page';

const weekdays = ['Mon 15', 'Tue 16', 'Wed 17', 'Thu 18', 'Fri 19'];

test.describe('Add my time off', () => {
  // L2-073 AC1
  test('opens on my week, Monday to Friday, each day set to my own entry', async ({ page }) => {
    await maraWithASchedule(page, (schedule) =>
      schedule.off(people.mara.membershipId, ['2027-02-16'], 'Tentative'),
    );
    await page.goto(timeOffUrl(mocksWeek));
    await new TimeOffPage(page).addMyTimeOff.click();
    const dialog = new AddTimeOffDialog(page);

    await expect(dialog.heading).toBeVisible();
    await expect(dialog.description).toHaveText(
      'Your week of Feb 15 – 19. Tentative means you plan to be off but haven’t confirmed it with work.',
    );
    for (const day of weekdays) await expect(dialog.day(day)).toBeVisible();
    await expect(dialog.days).toHaveCount(5);
    await expect(dialog.checked()).toHaveText([
      'Working',
      'Tentative',
      'Working',
      'Working',
      'Working',
    ]);
  });

  // L2-073 AC1: a radio group answers the arrow keys.
  test('moves between the choices of a day with the arrow keys', async ({ page }) => {
    await maraWithASchedule(page);
    await page.goto(timeOffUrl(mocksWeek));
    await new TimeOffPage(page).addMyTimeOff.click();
    const dialog = new AddTimeOffDialog(page);

    await dialog.choice('Mon 15', 'Working').focus();
    await page.keyboard.press('ArrowRight');

    await expect(dialog.choice('Mon 15', 'Off')).toBeChecked();
    await expect(dialog.choice('Mon 15', 'Off')).toBeFocused();
  });

  // L2-073 AC2
  test('saves my week: "Saving…" while it goes, then it closes and my row shows it', async ({
    page,
  }) => {
    const schedule = await maraWithASchedule(page);
    await page.goto(timeOffUrl(mocksWeek));
    const timeOff = new TimeOffPage(page);
    await timeOff.addMyTimeOff.click();
    const dialog = new AddTimeOffDialog(page);
    await dialog.choice('Mon 15', 'Off').click();
    await dialog.choice('Tue 16', 'Off').click();
    await dialog.choice('Wed 17', 'Off').click();
    await dialog.choice('Thu 18', 'Tentative').click();
    const release = schedule.holdSaves();

    await dialog.save.click();

    await expect(dialog.save).toHaveText('Saving…');
    await expect(dialog.save).toBeDisabled();
    release();
    await expect(dialog.root).toHaveCount(0);
    await expect(timeOff.cellsOf('Mara')).toHaveText([
      'Off',
      'Off',
      'Off',
      'Tentative',
      'Working',
      '',
      '',
    ]);
    expect(scheduleOf(page).saves).toEqual([
      {
        membershipId: people.mara.membershipId,
        week: mocksWeek,
        days: ['Off', 'Off', 'Off', 'Tentative', 'Working'],
      },
    ]);
  });

  // L2-073 AC3
  test('keeps my choices when saving fails, and saves them when I try again', async ({ page }) => {
    const schedule = await maraWithASchedule(page);
    await page.goto(timeOffUrl(mocksWeek));
    const timeOff = new TimeOffPage(page);
    await timeOff.addMyTimeOff.click();
    const dialog = new AddTimeOffDialog(page);
    await dialog.choice('Fri 19', 'Off').click();
    schedule.failSaves();

    await dialog.save.click();

    await expect(dialog.alert).toHaveText(
      /We couldn’t save that\.\s*Your choices are still here\. Try again\./,
    );
    await expect(dialog.heading).toBeVisible();
    await expect(dialog.save).toBeEnabled();
    await expect(dialog.choice('Fri 19', 'Off')).toBeChecked();

    schedule.recover();
    await dialog.save.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(timeOff.cellsOf('Mara').nth(4)).toHaveText('Off');
  });

  // L2-073 AC5
  test('cannot save a week more than a year ahead', async ({ page }) => {
    await maraWithASchedule(page);
    await page.goto(timeOffUrl('2028-02-21'));
    await new TimeOffPage(page).addMyTimeOff.click();
    const dialog = new AddTimeOffDialog(page);

    await expect(dialog.description).toHaveText(/^Your week of Feb 21 – 25, 2028\./);
    await expect(dialog.alert).toHaveText(
      /That’s more than a year ahead\.\s*Time off can be entered up to a year ahead\. Pick a nearer week\./,
    );
    await expect(dialog.save).toBeDisabled();
    await expect(dialog.choice('Mon 21', 'Off')).toBeDisabled();
    await expect(dialog.checked()).toHaveText(Array(5).fill('Working'));
  });

  // The dialog closes from its Close button and changes nothing.
  test('closes without saving', async ({ page }) => {
    await maraWithASchedule(page);
    await page.goto(timeOffUrl(mocksWeek));
    const timeOff = new TimeOffPage(page);
    await timeOff.addMyTimeOff.click();
    const dialog = new AddTimeOffDialog(page);
    await dialog.choice('Mon 15', 'Off').click();

    await dialog.close.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(timeOff.cellsOf('Mara').first()).toHaveText('Working');
    expect(scheduleOf(page).saves).toEqual([]);
  });
});
