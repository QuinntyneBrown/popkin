// Acceptance Test
// Traces to: L2-143, L2-144, L2-145, L2-128 AC5, known gap 105 (ruled)
// Description: Habits leads with the one overdue, lists the rest with their strips, keeps one with "We met up" and Undo, and starts and ends a habit.
import {
  answerChidisKeep,
  chidiProfile,
  chidisHabit,
  contactsMorning,
  habitId,
  habitsKey,
  marasHabits,
  noHabits,
  recordedContactId,
} from '../fixtures/contacts';
import { expect, test } from '../fixtures/pk-test';
import { answer, failNetwork, hold } from '../fixtures/stubs';
import { ContactProfilePage } from '../pages/contact-profile.page';
import { ContactsHabitsPage } from '../pages/contacts-habits.page';
import { NewHabitDialog } from '../pages/new-habit.dialog';
import { Toasts } from '../pages/toasts';

const chidi = () => recordedContactId('Chidi Okafor');

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: contactsMorning });
});

test.describe('Habits', () => {
  // L2-143 AC1, AC2, AC5, AC6
  test('leads with the overdue habit and lists the rest, soonest first', async ({ page, pk }) => {
    await marasHabits(page);
    await pk.open('contactsHabits');
    const habits = new ContactsHabitsPage(page);

    await expect(habits.heading).toHaveText('Habits');
    await expect(habits.sub).toHaveText('Small rhythms that keep people close');
    await expect(habits.leadWhen).toHaveText('Two days overdue');
    await expect(habits.leadTitle).toHaveText('Lunch with Chidi');
    await expect(habits.leadSub).toHaveText('Every 2 weeks · you’ve kept 9 of the last 12');
    await expect(habits.leadStrip).toHaveAttribute(
      'aria-label',
      'Kept 9 of the last 12, the latest one is due',
    );
    await expect(habits.call).toHaveText('Call Chidi');
    await expect(habits.call).toHaveAttribute('href', 'tel:+447700900788');
    await expect(habits.rowTitles).toHaveText([
      'Sunday call with Ada',
      'Garden tea with Ruth',
      'Catch-up with Grace',
    ]);
    await expect(habits.rowStrips.nth(0)).toHaveAttribute('aria-label', 'Kept 11 of the last 12');
    await expect(habits.rowStrips.nth(1)).toHaveAttribute('aria-label', 'Kept 6 of the last 12');
    await expect(habits.rowStrips.nth(2)).toHaveAttribute('aria-label', 'Kept 10 of the last 12');
    await expect(habits.rowStreaks).toHaveText([
      '10 weeks running',
      '4 months running',
      '8 months running',
    ]);
    await expect(habits.rowNext).toHaveText([
      'Next Sun, Sep 20',
      'Next Sat, Oct 3',
      'Next Sun, Oct 11',
    ]);
    await expect(habits.rows.first().getByRole('link')).toHaveAttribute(
      'href',
      `/contacts/people/${chidi()}`,
    );
  });

  // L2-144 AC1, AC2
  test('We met up logs it for the fortnight, and Undo puts it back', async ({ page, pk }) => {
    await marasHabits(page);
    await answerChidisKeep(page);
    await page.route(`**/api/contacts/habits/${habitId(1)}/kept/*`, (route) =>
      route.fulfill({ json: chidisHabit() }),
    );
    await pk.open('contactsHabits');
    const habits = new ContactsHabitsPage(page);
    const toasts = new Toasts(page);
    const sent = page.waitForRequest(
      (request) => request.method() === 'POST' && request.url().endsWith('/kept'),
    );

    await habits.metUp.click();

    expect((await sent).postDataJSON()).toMatchObject({ keptOn: '2026-09-15' });
    await expect(habits.leadWhen).toHaveText('Logged for this fortnight');
    await expect(habits.metUp).toHaveAttribute('aria-pressed', 'true');
    await expect(toasts.toast).toContainText('Lunch with Chidi logged');
    await expect(toasts.toast).toContainText('Your next one is due by Tue, Sep 29.');
    const undone = page.waitForRequest((request) => request.method() === 'DELETE');

    await toasts.toast.getByRole('button', { name: 'Undo' }).click();

    expect((await undone).url()).toContain(`/api/contacts/habits/${habitId(1)}/kept/`);
    await expect(habits.leadWhen).toHaveText('Two days overdue');
    await expect(habits.metUp).toHaveAttribute('aria-pressed', 'false');
  });

  // L2-143 AC4
  test('with none yet, says what a habit is and offers New habit', async ({ page, pk }) => {
    await noHabits(page);
    await pk.open('contactsHabitsEmpty');
    const habits = new ContactsHabitsPage(page);

    await expect(habits.stateHeading).toHaveText('No habits yet');
    await expect(habits.stateText).toHaveText(
      'A habit is a rhythm with someone: a Sunday call, a monthly catch-up. We’ll nudge you when one is due, and again if it slips.',
    );
    await expect(habits.stateAction).toHaveText('New habit');
  });

  test('a failed read says the streaks are safe and offers Try again', async ({ page, pk }) => {
    await failNetwork(page, habitsKey);
    await pk.open('contactsHabitsError');
    const habits = new ContactsHabitsPage(page);

    await expect(habits.stateHeading).toHaveText('We couldn’t load your habits');
    await expect(habits.stateText).toHaveText(
      'Your streaks are safe. Check your connection and try again.',
    );
    await expect(habits.tryAgain).toBeVisible();
  });
});

test.describe('New habit', () => {
  // L2-145 AC2, AC5
  test('from Habits asks who it is with, and what, before anything is sent', async ({
    page,
    pk,
  }) => {
    await noHabits(page);
    await pk.open('newHabitChoose');
    await new ContactsHabitsPage(page).newHabit.click();
    const dialog = new NewHabitDialog(page);
    await expect(dialog.withChoice).toBeVisible();
    await expect(dialog.withChoice.locator('option')).toContainText([
      'Choose someone',
      'Chidi Okafor',
    ]);
    await expect(dialog.often('Weekly')).toHaveAttribute('aria-checked', 'true');

    await dialog.start.click();

    await expect(dialog.summary.getByRole('link')).toHaveText([
      'With: choose who the habit is with.',
      'What: say what you’ll do together.',
    ]);
    await expect(dialog.whatError).toHaveText('Say what you’ll do together, like “Sunday call”.');
    await expect(dialog.withChoice).toHaveAttribute('aria-invalid', 'true');
  });

  // L2-145 AC5, AC6
  test('does not offer someone who already has a habit', async ({ page, pk }) => {
    await marasHabits(page);
    await pk.open('newHabitChoose');
    await new ContactsHabitsPage(page).newHabit.click();
    const dialog = new NewHabitDialog(page);

    await expect(dialog.withChoice.locator('option')).not.toContainText(['Chidi Okafor']);
  });

  // L2-145 AC1, AC3
  test('from a profile is with them, and once started shows on the profile', async ({
    page,
    pk,
  }) => {
    await chidiProfile(page, { habit: null });
    await answer(page, 'POST /api/contacts/habits', { status: 201, body: chidisHabit() });
    await pk.open('newHabit');
    const profile = new ContactProfilePage(page);
    await profile.makeHabit.click();
    const dialog = new NewHabitDialog(page);
    await expect(dialog.withPerson).toContainText('Chidi Okafor');
    await expect(dialog.change).toBeVisible();
    await expect(dialog.what).toHaveAttribute('placeholder', 'Sunday call, lunch, a walk…');
    await expect(dialog.hint).toBeVisible();
    await dialog.what.fill('Lunch');
    await dialog.often('Every 2 weeks').click();
    const sent = page.waitForRequest(
      (request) => request.method() === 'POST' && request.url().endsWith('/api/contacts/habits'),
    );

    await dialog.start.click();

    expect((await sent).postDataJSON()).toMatchObject({
      contactId: chidi(),
      what: 'Lunch',
      rhythm: 'EveryTwoWeeks',
    });
    await expect(dialog.root).toHaveCount(0);
    await expect(profile.habitTitle).toHaveText('Lunch with Chidi');
  });

  // L2-145 AC5
  test('Change makes With a choice', async ({ page, pk }) => {
    await chidiProfile(page, { habit: null });
    await noHabits(page);
    await pk.open('newHabit');
    await new ContactProfilePage(page).makeHabit.click();
    const dialog = new NewHabitDialog(page);

    await dialog.change.click();

    await expect(dialog.withPerson).toHaveCount(0);
    await expect(dialog.withChoice).toHaveValue('');
  });

  test('while starting, the button reads Starting… and is disabled', async ({ page, pk }) => {
    await chidiProfile(page, { habit: null });
    await hold(page, 'POST /api/contacts/habits');
    await pk.open('newHabitBusy');
    await new ContactProfilePage(page).makeHabit.click();
    const dialog = new NewHabitDialog(page);
    await dialog.what.fill('Walk round Roundhay Park');

    await dialog.start.click();

    await expect(dialog.start).toHaveText('Starting…');
    await expect(dialog.start).toBeDisabled();
  });
});

test.describe('A habit on the profile', () => {
  // L2-128 AC5
  test('shows its rhythm, name, strip and when it was due', async ({ page, pk }) => {
    await chidiProfile(page);
    await pk.open('contactProfile');
    const profile = new ContactProfilePage(page);

    await expect(profile.habitOver).toHaveText('Every 2 weeks');
    await expect(profile.habitTitle).toHaveText('Lunch with Chidi');
    await expect(profile.habitTitle.getByRole('link')).toHaveAttribute('href', '/contacts/habits');
    await expect(profile.habitStrip).toHaveAttribute(
      'aria-label',
      'Kept 9 of the last 12, the latest one is due',
    );
    await expect(profile.habitFoot).toHaveText('Overdue since Sep 13');
    await expect(profile.makeHabit).toHaveCount(0);
  });

  // L2-144 AC3
  test('End this habit takes it off, and Undo brings it back', async ({ page, pk }) => {
    await chidiProfile(page);
    await page.route(`**/api/contacts/habits/${habitId(1)}/end`, (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({ status: 204 })
        : route.fulfill({ json: chidisHabit() }),
    );
    await pk.open('contactProfile');
    const profile = new ContactProfilePage(page);
    const toasts = new Toasts(page);

    await profile.endHabit.click();

    await expect(profile.habit).toHaveCount(0);
    await expect(profile.makeHabit).toHaveText('Make a habit of seeing Chidi');
    await expect(toasts.toast).toContainText('Lunch with Chidi ended');

    await toasts.toast.getByRole('button', { name: 'Undo' }).click();

    await expect(profile.habitTitle).toHaveText('Lunch with Chidi');
  });
});
