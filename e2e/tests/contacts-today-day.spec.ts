// Acceptance Test
// Traces to: L2-125, L2-142, L2-123, known gaps 99 and 111 (ruled)
// Description: Today with people in Contacts: the next date, Coming up, To do today, Recently and It's been a while; ticking a follow-up done with Undo; loading and failure.
import { contactsMorning } from '../fixtures/contacts';
import { expect, test } from '../fixtures/pk-test';
import { answer, failNetwork, hold } from '../fixtures/stubs';
import { ladderId, marasToday, todayKey } from '../fixtures/today';
import { ContactsTodayPage } from '../pages/contacts-today.page';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: contactsMorning });
});

test.describe('Today with people in Contacts', () => {
  // L2-125 AC2
  test('leads with Grace’s birthday, what she loves and the last time they talked', async ({
    page,
    pk,
  }) => {
    await marasToday(page);

    await pk.open('contactsToday');

    const today = new ContactsTodayPage(page);
    await expect(today.spotlight).toContainText('Saturday · in 4 days');
    await expect(today.spotlightHeading).toHaveText('Grace’s birthday');
    await expect(today.spotlight).toContainText('Turns 33 · Best friend from uni');
    await expect(today.spotlight).toContainText(
      'Grace is into pottery, natural wine and Sunday markets.',
    );
    await expect(today.spotlight).toContainText('Last time: Venue’s booked.');
    await expect(today.spotlight.getByRole('link', { name: 'Message Grace' })).toHaveAttribute(
      'href',
      'sms:+447700900155',
    );
    await expect(today.spotlight.getByRole('link', { name: 'Grace’s profile' })).toBeVisible();
  });

  // L2-125 AC9
  test('on a wide screen, sets the next date and Coming up beside To do today and Recently', async ({
    page,
    pk,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await marasToday(page);

    await pk.open('contactsToday');

    const today = new ContactsTodayPage(page);
    const [spotlight, comingUp, toDo, recent] = await Promise.all(
      [today.spotlight, today.comingUp, today.toDo, today.recent].map((part) => part.boundingBox()),
    );
    expect(toDo!.x).toBeGreaterThanOrEqual(spotlight!.x + spotlight!.width);
    expect(recent!.x).toBeGreaterThanOrEqual(comingUp!.x + comingUp!.width);
    expect(toDo!.y).toBeLessThan(spotlight!.y + spotlight!.height);
  });

  // L2-125 AC9
  test('on a phone, stacks them one above the next', async ({ page, pk }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await marasToday(page);

    await pk.open('contactsToday');

    const today = new ContactsTodayPage(page);
    const [spotlight, toDo] = await Promise.all(
      [today.spotlight, today.toDo].map((part) => part.boundingBox()),
    );
    expect(toDo!.y).toBeGreaterThanOrEqual(spotlight!.y + spotlight!.height);
  });

  // L2-125 AC3
  test('lists what is coming up, soonest first, with the days left', async ({ page, pk }) => {
    await marasToday(page);

    await pk.open('contactsToday');

    const today = new ContactsTodayPage(page);
    await expect(today.comingUpRows).toHaveCount(4);
    await expect(today.comingUpRows.first()).toContainText('Chidi’s anniversary');
    await expect(today.comingUpRows.first()).toContainText('5 years married');
    await expect(today.comingUpRows.first()).toContainText('11 days');
    await expect(today.comingUp.getByRole('link', { name: 'All dates' })).toHaveAttribute(
      'href',
      '/contacts/dates',
    );
  });

  // L2-125 AC4, AC5
  test('lists the follow-ups due and the habit overdue', async ({ page, pk }) => {
    await marasToday(page);

    await pk.open('contactsToday');

    const today = new ContactsTodayPage(page);
    await expect(today.toDo).toContainText('2 days late · You promised');
    await expect(today.toDo).toContainText('Today · You promised');
    await expect(
      today.toDo.getByRole('link', { name: 'Lunch with Chidi is overdue' }),
    ).toBeVisible();
    await expect(today.toDo).toContainText('Every 2 weeks · the last one was Aug 30');
    await expect(today.toDo.getByRole('link', { name: 'Call' })).toHaveAttribute(
      'href',
      'tel:+447700900788',
    );
  });

  // L2-142, L2-124 AC4
  test('ticks a follow-up done at once, and Undo opens it again', async ({ page, pk }) => {
    await marasToday(page);
    await answer(page, `PUT /api/contacts/follow-ups/${ladderId}/done`, {
      status: 200,
      body: { id: ladderId },
    });
    await pk.open('contactsToday');
    const today = new ContactsTodayPage(page);

    await today.markDone('Return Ruth’s ladder').click();

    await expect(today.markNotDone('Return Ruth’s ladder')).toHaveAttribute('aria-pressed', 'true');
    await expect(today.toast).toContainText('Marked done');
    await today.toast.getByRole('button', { name: 'Undo' }).click();
    await expect(today.markDone('Return Ruth’s ladder')).toHaveAttribute('aria-pressed', 'false');
  });

  // L2-125 AC6
  test('lists the latest entries by channel or title, and when', async ({ page, pk }) => {
    await marasToday(page);

    await pk.open('contactsToday');

    const today = new ContactsTodayPage(page);
    await expect(today.recentRows).toHaveCount(5);
    await expect(today.recentRows.nth(0)).toContainText('Ada · Phone');
    await expect(today.recentRows.nth(0)).toContainText('Sun');
    await expect(today.recentRows.nth(2)).toContainText('Fri');
    await expect(today.recentRows.nth(3)).toContainText('Dev · Moved to Chapel Allerton');
    await expect(today.recentRows.nth(3)).toContainText('Sep 7');
  });

  // L2-125 AC7
  test('says who it has been a while with, and each opens Log', async ({ page, pk }) => {
    await marasToday(page);

    await pk.open('contactsToday');

    const today = new ContactsTodayPage(page);
    await expect(today.drift).toContainText(
      'It’s been a while with Sam and Joel. Log a catch-up when you talk.',
    );
    await expect(today.drift.getByRole('link', { name: 'Sam · 59 days' })).toHaveAttribute(
      'href',
      /\/contacts\/people\/[^/]+\/log$/,
    );
  });

  // L2-125: a section with nothing to show is left out
  test('leaves out a section with nothing to show', async ({ page, pk }) => {
    await marasToday(page, { next: null, comingUp: [], drifting: [] });

    await pk.open('contactsToday');

    const today = new ContactsTodayPage(page);
    await expect(today.recentRows).toHaveCount(5);
    await expect(today.spotlight).toHaveCount(0);
    await expect(today.comingUp).toHaveCount(0);
    await expect(today.drift).toHaveCount(0);
  });

  // L2-123 AC1
  test('says it is loading the day', async ({ page, pk }) => {
    await marasToday(page);
    await hold(page, todayKey);

    await pk.open('contactsToday');

    await expect(new ContactsTodayPage(page).status).toHaveText('Loading your day…');
  });

  // L2-123 AC2, AC3
  test('says the day could not be loaded, and Try again reads it again', async ({ page, pk }) => {
    await marasToday(page);
    await failNetwork(page, todayKey);
    await pk.open('contactsToday');
    const today = new ContactsTodayPage(page);

    await expect(today.failed).toContainText('We couldn’t load your day');
    await expect(today.failed).toContainText(
      'Nothing you saved is lost. Check your connection and try again.',
    );
    await marasToday(page);
    await today.failed.getByRole('button', { name: 'Try again' }).click();
    await expect(today.spotlightHeading).toHaveText('Grace’s birthday');
  });
});
