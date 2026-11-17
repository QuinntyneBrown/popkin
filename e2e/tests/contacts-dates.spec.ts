// Acceptance Test
// Traces to: L2-137, L2-138, L2-139, L2-123
// Description: Dates lists every key date by month, soonest first, narrowed by kind; Add a date keeps a new one.
import {
  chidiProfile,
  contactsMorning,
  datesKey,
  marasDates,
  marasPeople,
  noDates,
  recordedContactId,
} from '../fixtures/contacts';
import { expect, test } from '../fixtures/pk-test';
import { answer, failNetwork, hold, recordedBody } from '../fixtures/stubs';
import { AddDateDialog } from '../pages/add-date.dialog';
import { ContactProfilePage } from '../pages/contact-profile.page';
import { ContactsDatesPage } from '../pages/contacts-dates.page';

const graceId = '00000000-0000-4000-d000-000000000006';
const addForGrace = `POST /api/contacts/people/${graceId}/key-dates`;

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: contactsMorning });
});

test.describe('Dates', () => {
  // L2-137 AC1, AC3; L2-139 AC1; L2-140 AC4 (both ways on at a first visit)
  test('lists Mara’s dates by month, soonest first, with her reminder defaults', async ({
    page,
    pk,
  }) => {
    await marasDates(page);
    await pk.open('contactsDates');
    const dates = new ContactsDatesPage(page);

    await expect(dates.heading).toHaveText('Dates');
    await expect(dates.sub).toHaveText(
      'Birthdays, anniversaries and the days that matter to your people',
    );
    await expect(dates.filter('Everything')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('main h2').filter({ hasNotText: 'Reminders' })).toHaveText([
      'September',
      'October',
      'November',
      'December',
    ]);
    await expect(dates.rows.locator('.row__title')).toHaveText([
      'Grace’s birthday',
      'Chidi’s anniversary',
      'Iris is one month old',
      'Ada’s birthday',
      'Ruth’s birthday',
      'Dev’s 5 years at the studio',
      'Walt’s birthday',
      'Ifeoma’s birthday',
      'Grace & Femi’s wedding',
    ]);
    const grace = dates.row('Grace’s birthday');
    await expect(grace).toContainText('Sat');
    await expect(grace).toContainText('19');
    await expect(grace).toContainText('Turns 33');
    await expect(grace).toContainText('in 4 days');
    await expect(grace).toContainText('1 week before');
    await expect(grace.locator('.date-tile')).toHaveClass(/date-tile--soon/);
    await expect(dates.row('Iris is one month old').locator('.date-tile')).not.toHaveClass(
      /date-tile--soon/,
    );
    await expect(dates.row('Chidi’s anniversary')).toContainText('5 years married');
    await expect(grace).toHaveAttribute(
      'href',
      `/contacts/people/${recordedContactId('Chidi Okafor')}`,
    );
    await expect(dates.defaultFor('Birthdays')).toHaveValue('OneWeekBefore');
    await expect(dates.defaultFor('Anniversaries')).toHaveValue('ThreeDaysBefore');
    await expect(dates.defaultFor('Milestones')).toHaveValue('OnTheDay');
    // How reminders arrive moved to Notifications; Dates keeps the lead times only (L2-140 AC4).
    await expect(dates.reminders.getByRole('switch')).toHaveCount(0);
    await expect(dates.nav.current).toHaveText(/Dates/);
  });

  // L2-137 AC2
  test('Birthdays shows only birthdays', async ({ page, pk }) => {
    await marasDates(page);
    await marasDates(page, 'birthdays');
    await pk.open('contactsDatesBirthdays');
    const dates = new ContactsDatesPage(page);
    await expect(dates.rows).toHaveCount(9);

    await dates.filter('Birthdays').click();

    await expect(dates.filter('Birthdays')).toHaveAttribute('aria-pressed', 'true');
    await expect(dates.rows.locator('.row__title')).toHaveText([
      'Grace’s birthday',
      'Ada’s birthday',
      'Ruth’s birthday',
      'Walt’s birthday',
      'Ifeoma’s birthday',
    ]);
  });

  // L2-137 AC4
  test('with no dates, says so and offers Add a date, without the reminder settings', async ({
    page,
    pk,
  }) => {
    await noDates(page);
    await pk.open('contactsDatesEmpty');
    const dates = new ContactsDatesPage(page);

    await expect(dates.stateHeading).toHaveText('No dates yet');
    await expect(dates.stateText).toHaveText(
      'Add a birthday or an anniversary and we’ll remind you ahead of it, in good time to send a card.',
    );
    await expect(dates.stateAction('Add a date')).toBeVisible();
    await expect(dates.reminders).toHaveCount(0);
  });

  // L2-123 AC1
  test('says it is loading while Dates is read', async ({ page, pk }) => {
    await hold(page, datesKey);
    await pk.open('contactsDatesLoading');

    await expect(new ContactsDatesPage(page).loading).toBeAttached();
  });

  // L2-123 AC2, AC3
  test('a failed read says so, and Try again reads Dates again', async ({ page, pk }) => {
    await failNetwork(page, datesKey);
    await pk.open('contactsDatesError');
    const dates = new ContactsDatesPage(page);

    await expect(dates.stateHeading).toHaveText('We couldn’t load your dates');
    await expect(dates.stateText).toHaveText(
      'Your reminders still go out. Check your connection and try again.',
    );
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await marasDates(page);
    await dates.tryAgain.click();

    await expect(dates.rows).toHaveCount(9);
  });

  // L2-139 AC2
  test('a changed default is saved at once', async ({ page, pk }) => {
    await marasDates(page);
    await pk.open('contactsDates');
    const dates = new ContactsDatesPage(page);
    const sent = page.waitForRequest(
      (r) => r.method() === 'PUT' && r.url().endsWith('/reminder-preferences'),
    );

    await dates.defaultFor('Birthdays').selectOption('TwoWeeksBefore');

    expect((await sent).postDataJSON()).toEqual({
      birthdayLead: 'TwoWeeksBefore',
      anniversaryLead: 'ThreeDaysBefore',
      milestoneLead: 'OnTheDay',
    });
  });
});

test.describe('Add a date', () => {
  test.beforeEach(async ({ page }) => {
    await marasPeople(page);
    await marasDates(page);
  });

  // L2-138 AC1, AC3
  test('offers who, what kind, the day, the reminder and Every year', async ({ page, pk }) => {
    await pk.open('addDate');
    await new ContactsDatesPage(page).addDate.click();
    const dialog = new AddDateDialog(page);

    await expect(dialog.heading).toHaveText('Add a date');
    await expect(dialog.forWho.locator('option')).toHaveCount(14);
    await expect(dialog.forWho).toHaveValue('');
    await expect(dialog.kinds.getByRole('radio')).toHaveText([
      'Birthday',
      'Anniversary',
      'Something else',
    ]);
    await expect(dialog.everyYear).toHaveAttribute('aria-checked', 'true');

    await dialog.kind('Anniversary').click();
    await expect(dialog.remind).toHaveValue('ThreeDaysBefore');
    await expect(dialog.title).toHaveCount(0);

    await dialog.kind('Something else').click();
    await expect(dialog.remind).toHaveValue('OneWeekBefore');
    await expect(dialog.title).toBeVisible();
  });

  // L2-138 AC4
  test('Save the date keeps it for that person and reads Dates again', async ({ page, pk }) => {
    await answer(page, addForGrace, {
      status: 201,
      body: recordedBody(
        `POST /api/contacts/people/${recordedContactId('Chidi Okafor')}/key-dates`,
      ),
    });
    await pk.open('addDate');
    const dates = new ContactsDatesPage(page);
    await dates.addDate.click();
    const dialog = new AddDateDialog(page);
    await dialog.forWho.selectOption({ label: 'Grace Adeyemi' });
    await dialog.kind('Birthday').click();
    await dialog.day.fill('1993-09-19');
    const sent = page.waitForRequest(
      (r) => r.method() === 'POST' && r.url().includes(`/people/${graceId}/key-dates`),
    );
    const reread = page.waitForRequest((r) => r.url().includes('/api/contacts/dates?'));

    await dialog.save.click();

    const body = (await sent).postDataJSON();
    expect(body).toMatchObject({
      kind: 'Birthday',
      title: null,
      month: 9,
      day: 19,
      year: 1993,
      everyYear: true,
      lead: 'OneWeekBefore',
    });
    await reread;
    await expect(dialog.root).toBeHidden();
  });

  // L2-138 AC2
  test('without a day, says what to fix', async ({ page, pk }) => {
    await pk.open('addDateInvalid');
    await new ContactsDatesPage(page).addDate.click();
    const dialog = new AddDateDialog(page);
    await dialog.forWho.selectOption({ label: 'Grace Adeyemi' });
    await dialog.kind('Birthday').click();

    await dialog.save.click();

    await expect(dialog.summary).toContainText('One thing to fix');
    await expect(dialog.summary.getByRole('link')).toHaveText(
      'The day: pick it, so we know when to remind you.',
    );
    await expect(dialog.error('Pick the day, so we know when to remind you.')).toBeVisible();
    await expect(dialog.day).toHaveAttribute('aria-invalid', 'true');
  });

  // L2-123 AC5
  test('while saving, the button reads Saving… and is disabled', async ({ page, pk }) => {
    await hold(page, addForGrace);
    await pk.open('addDateBusy');
    await new ContactsDatesPage(page).addDate.click();
    const dialog = new AddDateDialog(page);
    await dialog.forWho.selectOption({ label: 'Grace Adeyemi' });
    await dialog.kind('Birthday').click();
    await dialog.day.fill('1993-09-19');

    await dialog.save.click();

    await expect(dialog.saving).toBeDisabled();
  });

  // L2-138 AC2 (known gap 113, ruled)
  test('without anyone chosen, asks who the date is for', async ({ page, pk }) => {
    await pk.open('addDateInvalid');
    await new ContactsDatesPage(page).addDate.click();
    const dialog = new AddDateDialog(page);
    await dialog.kind('Birthday').click();
    await dialog.day.fill('1993-09-19');

    await dialog.save.click();

    await expect(dialog.summary.getByRole('link')).toHaveText('For: choose who the date is for.');
  });
});

test.describe('Key dates on a profile', () => {
  const chidi = () => recordedContactId('Chidi Okafor');
  const keyDate = (over: object) => ({
    id: '00000000-0000-4000-e000-000000000101',
    kind: 'Birthday',
    title: null,
    month: 1,
    day: 24,
    year: null,
    everyYear: true,
    reminder: 'OneWeekBefore',
    nextOn: '2027-01-24',
    daysLeft: 131,
    ...over,
  });

  // L2-128 AC4 (known gap 101)
  test('lists Chidi’s dates, the near one with the days left', async ({ page, pk }) => {
    await chidiProfile(page, {
      keyDates: [
        keyDate({
          id: '00000000-0000-4000-e000-000000000102',
          kind: 'Anniversary',
          month: 9,
          day: 26,
          nextOn: '2026-09-26',
          daysLeft: 11,
          reminder: 'ThreeDaysBefore',
        }),
        keyDate({}),
      ],
    });
    await pk.open('contactProfile');
    const profile = new ContactProfilePage(page);

    await expect(profile.keyDateRows.locator('.row__title')).toHaveText([
      'Anniversary',
      'Birthday',
    ]);
    await expect(profile.keyDateRows.locator('.row__text')).toHaveText([
      'Sat, Sep 26 · in 11 days',
      'Jan 24',
    ]);
    await expect(profile.keyDateRows.first()).toContainText('Reminder: 3 days before');
  });

  // L2-138 AC1, AC4
  test('Add a date is for Chidi alone, and the profile reads again once it is kept', async ({
    page,
    pk,
  }) => {
    await chidiProfile(page);
    await pk.open('contactProfile');
    const profile = new ContactProfilePage(page);
    await profile.addDate.click();
    const dialog = new AddDateDialog(page);
    await expect(dialog.forWho).toHaveCount(0);
    await expect(dialog.remind).toHaveValue('TwoWeeksBefore');
    await dialog.day.fill('1990-01-24');
    const sent = page.waitForRequest(
      (r) => r.method() === 'POST' && r.url().endsWith(`/people/${chidi()}/key-dates`),
    );
    const reread = page.waitForRequest(
      (r) => r.method() === 'GET' && r.url().endsWith(`/api/contacts/people/${chidi()}`),
    );

    await dialog.save.click();

    expect((await sent).postDataJSON()).toMatchObject({
      kind: 'Birthday',
      month: 1,
      day: 24,
      year: 1990,
    });
    await reread;
    await expect(dialog.root).toBeHidden();
  });
});
