// Acceptance Test
// Traces to: L2-133, L2-134, L2-135, known gap 106 (ruled)
// Description: A conversation or milestone is logged about a contact, with its promises, and the
// profile's timeline lists what was logged, newest first.
import {
  chidiProfile,
  contactsMorning,
  femiProfile,
  recordedContactId,
} from '../fixtures/contacts';
import { expect, test } from '../fixtures/pk-test';
import { failNetwork } from '../fixtures/stubs';
import { AddDateDialog } from '../pages/add-date.dialog';
import { AddPromiseDialog } from '../pages/add-promise.dialog';
import { ContactProfilePage } from '../pages/contact-profile.page';
import { LogEntryPage } from '../pages/log-entry.page';

const chidi = () => recordedContactId('Chidi Okafor');

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: contactsMorning });
});

test.describe('Log a conversation', () => {
  // L2-133 AC1
  test('reads Talked with Chidi, how you talked, when and what you talked about', async ({
    page,
    pk,
  }) => {
    await chidiProfile(page);
    await pk.open('logEntry');
    const log = new LogEntryPage(page);

    await expect(log.heading).toHaveText('Talked with Chidi');
    await expect(log.cancel).toHaveAttribute('href', `/contacts/people/${chidi()}`);
    await expect(log.save).toBeVisible();
    await expect(log.whatToLog.getByRole('tab')).toHaveText(['Conversation', 'Milestone']);
    await expect(log.tab('Conversation')).toHaveAttribute('aria-selected', 'true');
    await expect(log.channels.getByRole('radio')).toHaveText([
      'In person',
      'Phone',
      'Video',
      'Messages',
    ]);
    await expect(log.when).toHaveText('Today, 8:40 am');
    await expect(log.talk).toBeVisible();
    await expect(log.promiseHint).toHaveText('It goes on your follow-ups, so it doesn’t slip.');
  });

  // L2-133 AC2, gap 106: a promise is added in its dialog, reminded tomorrow at first.
  test('a promise is listed with its day, and Remove takes it off', async ({ page, pk }) => {
    await chidiProfile(page);
    await pk.open('logEntry');
    const log = new LogEntryPage(page);
    const dialog = new AddPromiseDialog(page);

    await log.addPromise.click();
    await expect(dialog.remind).toHaveValue('2026-09-16');
    await dialog.add.click();
    await expect(dialog.error('Say what you’ll do, so it goes on your follow-ups.')).toBeVisible();
    await dialog.text.fill('Send him the flat-hunting checklist');
    await dialog.remind.fill('2026-09-17');
    await dialog.add.click();

    await expect(dialog.root).toBeHidden();
    await expect(log.promises).toHaveCount(1);
    await expect(log.promises.first()).toContainText('Send him the flat-hunting checklist');
    await expect(log.promises.first()).toContainText('Remind me Thu, Sep 17');
    await log.removePromise().click();
    await expect(log.promises).toHaveCount(0);
  });

  // L2-133 AC3
  test('Worth remembering offers Add a date, for Chidi', async ({ page, pk }) => {
    await chidiProfile(page);
    await pk.open('logEntry');
    const log = new LogEntryPage(page);

    await log.addDate.click();

    const dialog = new AddDateDialog(page);
    await expect(dialog.heading).toHaveText('Add a date');
    await expect(dialog.forWho).toHaveCount(0);
  });

  // L2-133 AC4
  test('with nothing written, Save sends nothing and says what to fix', async ({ page, pk }) => {
    await chidiProfile(page);
    await pk.open('logEntry');
    const log = new LogEntryPage(page);
    let sent = false;
    page.on('request', (r) => {
      if (r.method() === 'POST' && r.url().endsWith('/conversations')) sent = true;
    });

    await log.save.click();

    await expect(log.summaryHeading).toHaveText('One thing to fix');
    await expect(log.summaryLinks).toHaveText([
      'What did you talk about: write a line or two, so you remember it later.',
    ]);
    await expect(log.error('Write a line or two, so you remember it later.')).toBeVisible();
    expect(sent).toBe(false);
  });

  // L2-133 AC2, AC5
  test('saving sends the call and its promise, and opens the profile with it on top', async ({
    page,
    pk,
  }) => {
    await chidiProfile(page);
    await pk.open('logEntry');
    const log = new LogEntryPage(page);
    const dialog = new AddPromiseDialog(page);
    await log.channel('Phone').click();
    await log.talk.fill('Loving the team, hates the commute.');
    await log.addPromise.click();
    await dialog.text.fill('Send him the flat-hunting checklist');
    await dialog.remind.fill('2026-09-17');
    await dialog.add.click();
    const request = page.waitForRequest(
      (r) =>
        r.method() === 'POST' && r.url().endsWith(`/api/contacts/people/${chidi()}/conversations`),
    );

    await log.save.click();

    expect((await request).postDataJSON()).toMatchObject({
      channel: 'Phone',
      note: 'Loving the team, hates the commute.',
      // The clock runs on from 8:40 while the page works; "Today, 8:40 am" is to the minute.
      loggedAt: expect.stringMatching(/^2026-09-15T08:40:\d\d[+-]\d\d:\d\d$/),
      promises: [{ text: 'Send him the flat-hunting checklist', dueOn: '2026-09-17' }],
    });
    await expect(page).toHaveURL(`/contacts/people/${chidi()}`);
    const profile = new ContactProfilePage(page);
    await expect(profile.timelineEntries.first()).toContainText('Phone');
  });

  // L2-133 AC6
  test('a failed save keeps the note and says so', async ({ page, pk }) => {
    await chidiProfile(page);
    await failNetwork(page, `POST /api/contacts/people/${chidi()}/conversations`);
    await pk.open('logEntry');
    const log = new LogEntryPage(page);
    await log.talk.fill('Loving the team.');

    await log.save.click();

    await expect(log.alert).toContainText('We couldn’t save this.');
    await expect(log.alert).toContainText(
      'Your note is still here. Check your connection and try Save again.',
    );
    await expect(log.talk).toHaveValue('Loving the team.');
  });
});

test.describe('Log a milestone', () => {
  // L2-134 AC1, AC2
  test('reads Chidi’s milestone and names the yearly date it adds', async ({ page, pk }) => {
    await chidiProfile(page);
    await pk.open('logEntryMilestone');
    const log = new LogEntryPage(page);

    await expect(log.heading).toHaveText('Chidi’s milestone');
    await expect(log.tab('Milestone')).toHaveAttribute('aria-selected', 'true');
    await expect(log.kinds.getByRole('radio')).toHaveText([
      'New job',
      'Wedding',
      'New baby',
      'Moved',
      'Graduated',
      'Something else',
    ]);
    await expect(log.whenDay).toHaveValue('2026-09-15');
    await expect(log.everyYear).toHaveAttribute('aria-checked', 'true');
    await expect(log.yearlyHint).toHaveText(
      'Adds “Chidi’s work anniversary” to your dates, with a nudge on the day.',
    );
  });

  // L2-134 AC2, AC3
  test('saving sends the milestone, every year, and opens the profile', async ({ page, pk }) => {
    await chidiProfile(page);
    await pk.open('logEntryMilestone');
    const log = new LogEntryPage(page);
    await log.what.fill('Started as Senior Engineer at Arup');
    await log.whenDay.fill('2026-08-31');
    const request = page.waitForRequest(
      (r) =>
        r.method() === 'POST' && r.url().endsWith(`/api/contacts/people/${chidi()}/milestones`),
    );

    await log.save.click();

    expect((await request).postDataJSON()).toMatchObject({
      kind: 'NewJob',
      title: 'Started as Senior Engineer at Arup',
      happenedOn: '2026-08-31',
      everyYear: true,
    });
    await expect(page).toHaveURL(`/contacts/people/${chidi()}`);
  });

  // Gap 106: a milestone needs what happened.
  test('with nothing said, Save says what happened is needed', async ({ page, pk }) => {
    await chidiProfile(page);
    await pk.open('logEntryMilestone');
    const log = new LogEntryPage(page);

    await log.save.click();

    await expect(log.error('Say what happened.')).toBeVisible();
  });
});

test.describe('A contact’s timeline', () => {
  // L2-135 AC1
  test('lists what was logged with Chidi, newest first, and filters it', async ({ page, pk }) => {
    await chidiProfile(page);
    await pk.open('contactProfile');
    const profile = new ContactProfilePage(page);

    await expect(profile.timelineEntries).toHaveCount(3);
    await expect(profile.timelineEntries.nth(0)).toContainText('Sep 6');
    await expect(profile.timelineEntries.nth(0)).toContainText('Phone');
    await expect(profile.timelineEntries.nth(0)).toContainText('Loving the team');
    await expect(profile.timelineEntries.nth(1)).toContainText('Aug 31');
    await expect(profile.timelineEntries.nth(1)).toContainText('New job');
    await expect(profile.timelineEntries.nth(1)).toContainText(
      'Started as Senior Engineer at Arup',
    );
    await expect(profile.logMilestone).toHaveAttribute(
      'href',
      `/contacts/people/${chidi()}/log?kind=milestone`,
    );
    await expect(profile.logConversation).toHaveAttribute(
      'href',
      `/contacts/people/${chidi()}/log`,
    );

    await profile.timelineFilter('Milestones').click();

    await expect(profile.timelineEntries).toHaveCount(1);
    await expect(profile.timelineEntries.first()).toContainText('New job');
  });

  // L2-135 AC2
  test('with nothing logged with Femi, it says so and offers to log a conversation', async ({
    page,
    pk,
  }) => {
    await femiProfile(page);
    await pk.open('contactProfileEmpty');
    const profile = new ContactProfilePage(page);

    await expect(profile.emptyTimeline).toHaveText('Nothing logged with Femi yet');
    await expect(profile.timelineEntries).toHaveCount(0);
  });
});
