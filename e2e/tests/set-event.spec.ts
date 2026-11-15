// Acceptance Test
// Traces to: L2-085 AC1, AC2, AC3, AC4, AC5, AC7, L2-020 AC1
// Description: the Host sets the event from "Popkin settings": its label and days; time off marks
// it for everyone; the Host can remove it; a broken rule keeps "Save" off and says which; a
// failure keeps what was entered.
import { maraWithAnEvent, openSetEvent } from '../fixtures/event';
import { homeOf, homeUrl } from '../fixtures/home';
import { expect, test } from '../fixtures/pk-test';
import { scheduleUrl } from '../fixtures/schedule';
import { PopkinHomePage } from '../pages/popkin-home.page';
import { PopkinSettingsDialog } from '../pages/popkin-settings.dialog';
import { SetEventDialog } from '../pages/set-event.dialog';
import { TimeOffPage } from '../pages/time-off.page';
import { Toasts } from '../pages/toasts';

test.describe('Set the event in Popkin settings', () => {
  // L2-020 AC1, L2-085 AC1
  test('is offered to the Host with the event it sets, and opens set to it', async ({ page }) => {
    await maraWithAnEvent(page);
    await page.goto(homeUrl);
    await new PopkinHomePage(page).settings.click();
    const menu = new PopkinSettingsDialog(page);

    await expect(menu.setEvent).toContainText('Lake weekend · Mar 5 – 7');
    await menu.setEvent.click();

    const dialog = new SetEventDialog(page);
    await expect(dialog.description).toHaveText(
      'What you’re getting together for. Time off marks its days for everyone.',
    );
    await expect(dialog.label).toHaveValue('Lake weekend');
    await expect(dialog.firstDay).toHaveValue('2027-03-05');
    await expect(dialog.lastDay).toHaveValue('2027-03-07');
    await expect(dialog.save).toBeEnabled();
    await expect(dialog.remove).toBeVisible();
  });

  // L2-020 AC1, L2-085 AC1
  test('says "Not set" while there is none, and offers no removal', async ({ page }) => {
    await maraWithAnEvent(page, null);
    await page.goto(homeUrl);
    await new PopkinHomePage(page).settings.click();
    const menu = new PopkinSettingsDialog(page);
    await expect(menu.setEvent).toContainText('Not set');

    await menu.setEvent.click();

    const dialog = new SetEventDialog(page);
    await expect(dialog.label).toHaveValue('');
    await expect(dialog.error).toHaveCount(0);
    await expect(dialog.save).toBeDisabled();
    await expect(dialog.remove).toHaveCount(0);
  });

  // L2-020 AC1
  test('is not offered to a member who is not the Host', async ({ page }) => {
    await maraWithAnEvent(page, null, 'Member');
    await page.goto(homeUrl);
    await new PopkinHomePage(page).settings.click();
    const menu = new PopkinSettingsDialog(page);

    await expect(menu.leave).toBeVisible();
    await expect(menu.setEvent).toHaveCount(0);
  });

  // L2-020 AC1
  test('is not offered while Schedules is off', async ({ page }) => {
    await maraWithAnEvent(page);
    homeOf(page).popkin.schedules = false;
    await page.goto(homeUrl);
    await new PopkinHomePage(page).settings.click();
    const menu = new PopkinSettingsDialog(page);

    await expect(menu.wrapUp).toBeVisible();
    await expect(menu.setEvent).toHaveCount(0);
  });

  // L2-085 AC4
  test('saves, says so, and time off marks the event', async ({ page }) => {
    const settings = await maraWithAnEvent(page, null);
    await page.goto(homeUrl);
    const dialog = await openSetEvent(page);

    await dialog.label.fill('  Cabin week ');
    await dialog.firstDay.fill('2027-02-15');
    await dialog.lastDay.fill('2027-02-19');
    await dialog.save.click();

    await expect(dialog.root).toHaveCount(0);
    expect(settings.sent).toEqual([
      { label: 'Cabin week', firstDay: '2027-02-15', lastDay: '2027-02-19' },
    ]);
    await expect(new Toasts(page).toast).toContainText('Event saved');
    await page.goto(scheduleUrl);
    await expect(new TimeOffPage(page).eventLabels).toHaveText(Array(5).fill('Cabin week'));
  });

  // L2-085 AC4
  test('reads “Saving…” and cannot be sent twice while it saves', async ({ page }) => {
    const settings = await maraWithAnEvent(page);
    const release = settings.hold();
    await page.goto(homeUrl);
    const dialog = await openSetEvent(page);

    await dialog.save.click();

    await expect(dialog.save).toHaveText('Saving…');
    await expect(dialog.save).toBeDisabled();
    release();
    await expect(dialog.root).toHaveCount(0);
    expect(settings.sent).toHaveLength(1);
  });

  // L2-085 AC5
  test('removes the event, and time off opens on the current week', async ({ page }) => {
    const settings = await maraWithAnEvent(page);
    await page.goto(homeUrl);
    const dialog = await openSetEvent(page);

    await dialog.remove.click();

    await expect(dialog.root).toHaveCount(0);
    expect(settings.sent).toEqual([null]);
    await page.goto(scheduleUrl);
    const timeOff = new TimeOffPage(page);
    await expect(timeOff.pressedWeek).toHaveText('Feb 15 – 21');
    await expect(timeOff.eventLabels).toHaveCount(0);
  });

  // L2-085 AC2
  test('keeps "Save" off and says which rule is broken', async ({ page }) => {
    await maraWithAnEvent(page);
    await page.goto(homeUrl);
    const dialog = await openSetEvent(page);

    await dialog.label.fill('   ');
    await expect(dialog.error).toHaveText('Give the event a label.');
    await expect(dialog.label).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.save).toBeDisabled();

    await dialog.label.fill('Lake weekend');
    await dialog.lastDay.fill('2027-03-04');
    await expect(dialog.error).toHaveText('The last day is before the first day.');
    await expect(dialog.lastDay).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.save).toBeDisabled();

    await dialog.firstDay.fill('2028-02-18');
    await dialog.lastDay.fill('2028-02-20');
    await expect(dialog.error).toHaveText('The event can be set up to a year ahead.');
    await expect(dialog.save).toBeDisabled();
  });

  // L2-085 AC3
  test('takes no more than 40 characters of label', async ({ page }) => {
    await maraWithAnEvent(page);
    await page.goto(homeUrl);
    const dialog = await openSetEvent(page);

    await dialog.label.fill('');
    await dialog.label.pressSequentially('x'.repeat(45));

    await expect(dialog.label).toHaveValue('x'.repeat(40));
  });

  // L2-085 AC7
  test('stays open with what was entered when saving fails', async ({ page }) => {
    const settings = await maraWithAnEvent(page);
    settings.fail();
    await page.goto(homeUrl);
    const dialog = await openSetEvent(page);

    await dialog.label.fill('Lake days');
    await dialog.save.click();

    await expect(dialog.alert).toContainText('We couldn’t save the event.');
    await expect(dialog.alert).toContainText('What you entered is still here. Try again.');
    await expect(dialog.label).toHaveValue('Lake days');
    await expect(dialog.save).toHaveText('Save');
  });
});
