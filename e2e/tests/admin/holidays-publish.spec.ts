// Acceptance Test
// Traces to: L2-197 AC1-AC5, L2-087 AC2, AC5
// Description: an Owner changes an estimated holiday's date, which confirms it, and publishes next
// year with a reason; a holiday by rule offers no "Change"; a Viewer sees both switched off.
import { atTheRecording, signedInAs } from '../../fixtures/admin';
import { HOLIDAYS, holidayCalendarId } from '../../fixtures/holidays';
import { expect, test } from '../../fixtures/pk-test';
import { AdminActionDialog } from '../../pages/admin/admin-dialogs';
import { AdminHolidaysPage } from '../../pages/admin/holidays.page';

const next = HOLIDAYS.thisYear + 1;
const islamic = holidayCalendarId('Islamic holidays');

test.describe('Confirm and publish holiday dates (L2-197)', () => {
  test.beforeEach(({ page }) => atTheRecording(page));

  // Given an estimated date, when "Change" is chosen, then the row holds a date field with focus
  // and "Done"; Done sends the date and the row reads as before it opened (AC1).
  test('Change opens a date field and Done saves it', async ({ page, pk }) => {
    const view = new AdminHolidaysPage(page);
    await pk.open('adminHolidays');
    const ramadan = view.holiday('Ramadan begins');

    await ramadan.getByRole('button', { name: 'Change the date of Ramadan begins' }).click();

    const field = ramadan.getByLabel('Date of Ramadan begins', { exact: true });
    await expect(field).toBeFocused();
    await expect(field).toHaveValue(`${next}-02-08`);
    await expect(ramadan.locator('.status')).toHaveText('Confirmed');
    await field.fill(`${next}-02-09`);
    const [request] = await Promise.all([
      page.waitForRequest((r) => r.method() === 'PUT' && r.url().includes('/holidays/')),
      ramadan.getByRole('button', { name: 'Done' }).click(),
    ]);

    expect(request.postDataJSON()).toEqual({ date: `${next}-02-09` });
    await expect(field).toHaveCount(0);
  });

  // Given a row being changed, when Escape is pressed, then it is put back unchanged (AC1).
  test('Escape puts the row back', async ({ page, pk }) => {
    const view = new AdminHolidaysPage(page);
    await pk.open('adminHolidays');
    const ramadan = view.holiday('Ramadan begins');
    await ramadan.getByRole('button', { name: 'Change the date of Ramadan begins' }).click();

    await ramadan.getByLabel('Date of Ramadan begins', { exact: true }).press('Escape');

    await expect(ramadan.locator('td').nth(1)).toHaveText('Mon 8 Feb');
    await expect(ramadan.locator('.status')).toHaveText('Estimated');
  });

  // Given a calendar all by rule and live, when it shows, then no holiday offers "Change" and the
  // line says there is nothing to confirm (AC1).
  test('a calendar by rule offers no Change', async ({ page, pk }) => {
    const view = new AdminHolidaysPage(page);
    await pk.open('adminHolidaysRule');

    await expect(view.calendarName).toHaveText('United States');
    await expect(view.table.getByRole('button', { name: /Change/ })).toHaveCount(0);
    await expect(view.foot).toHaveText(
      `Every date follows a rule, so there is nothing to confirm. ${HOLIDAYS.thisYear} is live.`,
    );
  });

  // Given next year not yet published, when its holidays show, then the line counts the estimates,
  // and "Publish {year}" asks for a reason before it publishes; the toast says who it reaches
  // (AC2, AC3, AC4).
  test('publishes next year with a reason', async ({ page, pk }) => {
    const view = new AdminHolidaysPage(page);
    await pk.open('adminHolidays');

    await expect(view.foot).toContainText(
      '5 of 5 dates are still estimates. Members see them as “expected”.',
    );
    await view.publish.click();

    const dialog = new AdminActionDialog(page, `Publish Islamic holidays for ${next}?`, /Publish/);
    await expect(dialog.description).toHaveText(
      '5 dates appear on the Important days of everyone using this calendar, and on 0 Popkins. 5 are estimates and show as “expected” until you confirm them.',
    );
    await expect(dialog.reason).toBeFocused();
    await dialog.confirm.click();
    await expect(dialog.reasonField).toContainText('Give a reason; it goes in the audit log.');

    await dialog.reason.fill('Dates confirmed with the moon-sighting committee');
    const [request] = await Promise.all([
      page.waitForRequest(
        (r) => r.method() === 'POST' && r.url().endsWith(`/years/${next}/publish`),
      ),
      dialog.confirm.click(),
    ]);

    expect(request.url()).toContain(islamic);
    expect(request.postDataJSON()).toEqual({
      reason: 'Dates confirmed with the moon-sighting committee',
    });
    await expect(dialog.dialog).toHaveCount(0);
    await expect(view.toast).toContainText('Published');
    await expect(view.toast).toContainText(
      `Islamic holidays ${next} is live for 0 people and 0 Popkins.`,
    );
  });

  // Given the publish fails, when it is confirmed, then the dialog stays with the reason kept.
  test('a failed publish keeps the dialog and the reason', async ({ page, pk }) => {
    await page.route('**/publish', (route) => route.fulfill({ status: 503 }));
    const view = new AdminHolidaysPage(page);
    await pk.open('adminHolidays');
    await view.publish.click();
    const dialog = new AdminActionDialog(page, `Publish Islamic holidays for ${next}?`, /Publish/);

    await dialog.reason.fill('Dates');
    await dialog.confirm.click();

    await expect(dialog.alert).toContainText('That didn’t go through');
    await expect(dialog.reason).toHaveValue('Dates');
  });

  // Given a Viewer, when the page shows, then "Change" and "Publish {year}" are switched off
  // with "Viewer admins can't do this" (AC5).
  test('a Viewer sees Change and Publish switched off', async ({ page, pk }) => {
    await signedInAs(page, 'Viewer');
    const view = new AdminHolidaysPage(page);
    await pk.open('adminHolidays');

    const change = view.holiday('Ramadan begins').getByRole('button', { name: /Change/ });
    await expect(change).toHaveAttribute('aria-disabled', 'true');
    await expect(change).toHaveAttribute('title', 'Viewer admins can’t do this');
    await expect(view.publish).toHaveAttribute('aria-disabled', 'true');
  });
});
