import { howLongForLakeside } from '../fixtures/journeys';
import { expect, test } from '../fixtures/pk-test';
import { EndDateDialog } from '../pages/end-date.dialog';
import { HowLongPage } from '../pages/how-long.page';

test.describe('choosing how long a Popkin lasts', () => {
  // L2-009 AC1, AC6
  test('offers four lengths as one radio group with The weekend chosen, and says it can change', async ({
    page,
  }) => {
    await howLongForLakeside(page);

    const step = new HowLongPage(page);
    await expect(step.heading).toHaveText('How long should it last?');
    await expect(step.lead).toHaveText(
      'You can change this later. When it ends, everyone gets a recap.',
    );
    await expect(step.options).toHaveCount(4);
    await expect(step.option('Just today')).toContainText('Wraps up at midnight');
    await expect(step.option('The weekend')).toContainText('Wraps up Sunday, 6 pm');
    await expect(step.option('Until a date')).toContainText('You pick when it ends');
    await expect(step.option('Keep it going')).toContainText('No end date. Wrap up whenever.');
    await expect(step.option('The weekend')).toHaveAttribute('aria-checked', 'true');
    await expect(step.endDate).toHaveCount(0);
  });

  // L2-009 AC7
  test('the arrow keys move the choice between the four options', async ({ page }) => {
    await howLongForLakeside(page);
    const step = new HowLongPage(page);

    await step.option('The weekend').focus();
    await page.keyboard.press('ArrowDown');
    await expect(step.option('Until a date')).toBeFocused();
    await expect(step.option('Until a date')).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(step.option('Just today')).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('ArrowUp');
    await expect(step.option('Keep it going')).toHaveAttribute('aria-checked', 'true');
    await expect(step.option('The weekend')).toHaveAttribute('aria-checked', 'false');
    await expect(step.option('The weekend')).toHaveAttribute('tabindex', '-1');
  });

  // L2-009 AC2
  test('Until a date shows the chosen end and opens a date and time picker', async ({ page }) => {
    await howLongForLakeside(page);
    const step = new HowLongPage(page);

    await step.option('Until a date').click();

    await expect(step.endDate).toHaveText('Ends Sun, 13 Sep · 6:00 pm');
    await step.endDate.click();
    const dialog = new EndDateDialog(page);
    await expect(dialog.panel).toBeVisible();
    await expect(dialog.root).toHaveAttribute('aria-modal', 'true');
    await expect(dialog.day).toHaveValue('2026-09-13');
    await expect(dialog.time).toHaveValue('18:00');
    await expect(dialog.day).toBeFocused();
  });

  test('a new end is set with Set the end', async ({ page }) => {
    await howLongForLakeside(page);
    const step = new HowLongPage(page);
    await step.option('Until a date').click();
    await step.endDate.click();
    const dialog = new EndDateDialog(page);

    await dialog.day.fill('2026-10-03');
    await dialog.time.fill('20:30');
    await dialog.setTheEnd.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(step.endDate).toHaveText('Ends Sat, 3 Oct · 8:30 pm');
    await expect(step.endDate).toBeFocused();
  });

  // L2-009 AC3
  for (const [when, day, time] of [
    ['less than an hour ahead', '2026-09-12', '12:30'],
    ['more than a year ahead', '2027-09-13', '12:00'],
  ]) {
    test(`an end ${when} is refused with a message that states the limits`, async ({ page }) => {
      await howLongForLakeside(page);
      const step = new HowLongPage(page);
      await step.option('Until a date').click();
      await step.endDate.click();
      const dialog = new EndDateDialog(page);

      await dialog.day.fill(day);
      await dialog.time.fill(time);
      await dialog.setTheEnd.click();

      await expect(dialog.panel).toBeVisible();
      await expect(dialog.error).toHaveText(
        'Pick a time at least an hour from now and less than a year away.',
      );
      await expect(dialog.time).toHaveAttribute('aria-invalid', 'true');
      await page.keyboard.press('Escape');
      await expect(step.endDate).toHaveText('Ends Sun, 13 Sep · 6:00 pm');
    });
  }

  // L2-057 AC2
  test('Escape closes the picker and focus returns to the end date', async ({ page }) => {
    await howLongForLakeside(page);
    const step = new HowLongPage(page);
    await step.option('Until a date').click();
    await step.endDate.click();
    const dialog = new EndDateDialog(page);
    await dialog.day.fill('2026-10-03');

    await page.keyboard.press('Escape');

    await expect(dialog.root).toHaveCount(0);
    await expect(step.endDate).toBeFocused();
    await expect(step.endDate).toHaveText('Ends Sun, 13 Sep · 6:00 pm');
  });

  test('Close closes the picker too', async ({ page }) => {
    await howLongForLakeside(page);
    const step = new HowLongPage(page);
    await step.option('Until a date').click();
    await step.endDate.click();
    const dialog = new EndDateDialog(page);

    await dialog.close.click();

    await expect(dialog.root).toHaveCount(0);
  });

  test('Back keeps the length', async ({ page }) => {
    await howLongForLakeside(page);
    const step = new HowLongPage(page);
    await step.option('Keep it going').click();

    await step.back.click();
    await page.getByRole('button', { name: 'Looks good' }).click();

    await expect(step.option('Keep it going')).toHaveAttribute('aria-checked', 'true');
  });
});
