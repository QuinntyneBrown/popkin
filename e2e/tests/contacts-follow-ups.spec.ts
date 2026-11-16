// Acceptance Test
// Traces to: L2-141, L2-142, L2-121 AC5, L2-124 AC3, AC4
// Description: Follow-ups lists what the person said they would do by when it is due, adds one in a line and ticks them off.
import {
  answerTicks,
  contactsMorning,
  followUpsKey,
  marasFollowUps,
  noFollowUps,
  recordedContactId,
  serveRecordedPhotos,
} from '../fixtures/contacts';
import { expect, test } from '../fixtures/pk-test';
import { answer, failNetwork, hold } from '../fixtures/stubs';
import { ContactsFollowUpsPage } from '../pages/contacts-follow-ups.page';
import { Toasts } from '../pages/toasts';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: contactsMorning });
});

test.describe('Follow-ups', () => {
  // L2-141 AC1, L2-121 AC5
  test('lists the open follow-ups under Overdue, Today, This week and Later', async ({
    page,
    pk,
  }) => {
    await marasFollowUps(page);
    await pk.open('contactsFollowUps');
    const followUps = new ContactsFollowUpsPage(page);

    await expect(followUps.heading).toHaveText('Follow-ups');
    await expect(followUps.sub).toHaveText('8 open · 6 of them promises you made');
    await expect(followUps.add).toHaveAttribute('placeholder', 'Call Sam about the reference…');
    await expect(followUps.bucket('Overdue')).toContainText('2 days late');
    await expect(followUps.bucket('Today').locator('li.task')).toHaveCount(1);
    await expect(followUps.bucket('This week').locator('li.task')).toHaveCount(3);
    await expect(followUps.bucket('Later').locator('li.task')).toHaveCount(3);
    const ruth = followUps.task('Return Ruth’s ladder');
    await expect(ruth).toContainText('You promised · In person, Sat');
    await expect(ruth.getByRole('link', { name: 'Ruth' })).toHaveAttribute(
      'href',
      `/contacts/people/${recordedContactId('Chidi Okafor')}`,
    );
    await expect(followUps.task('Send Grace the Lisbon photos')).toContainText('Thu');
    await expect(followUps.task('Ask Chidi how the commute is going')).toContainText('Sep 20');
    await expect(followUps.markDone('Return Ruth’s ladder')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await expect(followUps.showDone).toHaveText('Show 1 done');
    await expect(followUps.nav.followUpsCount).toHaveText('2');
    await expect(followUps.nav.followUpsBadge).toContainText('2 follow-ups late or due today');
  });

  // L2-141 AC2
  test('Promises shows only promises, and the counts follow', async ({ page, pk }) => {
    await marasFollowUps(page);
    await pk.open('contactsFollowUps');
    const followUps = new ContactsFollowUpsPage(page);

    await followUps.tab('Promises').click();

    await expect(followUps.tab('Promises')).toHaveAttribute('aria-selected', 'true');
    await expect(followUps.tasks).toHaveCount(6);
    await expect(followUps.bucket('This week').locator('li.task')).toHaveCount(2);
    await expect(followUps.bucket('Later').locator('li.task')).toHaveCount(2);
    await expect(followUps.sub).toHaveText('8 open · 6 of them promises you made');
  });

  // L2-141 AC3
  test('Show 1 done lists it under Done, and Hide done hides it', async ({ page, pk }) => {
    await marasFollowUps(page);
    await pk.open('contactsFollowUps');
    const followUps = new ContactsFollowUpsPage(page);

    await followUps.showDone.click();

    await expect(followUps.done).toContainText('Bring the soup pot back on Thursday');
    await expect(followUps.done).toContainText('Done Sep 10');
    await expect(followUps.markNotDone('Bring the soup pot back on Thursday')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await followUps.hideDone.click();
    await expect(followUps.done).toBeHidden();
  });

  // L2-141 AC4
  test('with nothing open, says you are all caught up', async ({ page, pk }) => {
    await noFollowUps(page);
    await pk.open('contactsFollowUps');
    const followUps = new ContactsFollowUpsPage(page);

    await expect(followUps.sub).toHaveText('Nothing open');
    await expect(followUps.stateHeading).toHaveText('You’re all caught up');
    await expect(followUps.stateText).toHaveText(
      'Nothing you said you’d do is waiting. Add one above when it comes up, or log a conversation and note what you promised.',
    );
    await expect(followUps.goToPeople).toHaveAttribute('href', '/contacts/people');
    await expect(followUps.add).toBeVisible();
    await expect(followUps.nav.followUpsBadge).toHaveCount(0);
  });

  test('says when it cannot load, and Try again reads again', async ({ page, pk }) => {
    await failNetwork(page, followUpsKey);
    await pk.open('contactsFollowUps');
    const followUps = new ContactsFollowUpsPage(page);

    await expect(followUps.stateHeading).toHaveText('We couldn’t load your follow-ups');
    await expect(followUps.stateText).toHaveText(
      'Nothing you added is lost. Check your connection and try again.',
    );
    await expect(followUps.sub).toHaveCount(0);
    await marasFollowUps(page);
    await followUps.tryAgain.click();
    await expect(followUps.tasks).toHaveCount(8);
  });

  test('says it is loading while the list is read', async ({ page, pk }) => {
    await serveRecordedPhotos(page);
    const release = await hold(page, followUpsKey);
    await pk.open('contactsFollowUps');
    const followUps = new ContactsFollowUpsPage(page);

    await expect(followUps.loading).toBeAttached();
    release();
    await expect(followUps.loading).toHaveCount(0);
  });

  // L2-142 AC2, L2-124 AC4, L2-142 AC3
  test('Mark done strikes it through at once, and Undo opens it again', async ({ page, pk }) => {
    await marasFollowUps(page);
    await pk.open('contactsFollowUps');
    const followUps = new ContactsFollowUpsPage(page);
    await answerTicks(page);

    await followUps.markDone('Return Ruth’s ladder').click();

    await expect(followUps.markNotDone('Return Ruth’s ladder')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(followUps.nav.followUpsCount).toHaveText('1');
    const toasts = new Toasts(page);
    await expect(toasts.toast).toContainText('Marked done');
    await expect(toasts.toast).toContainText('Return Ruth’s ladder.');
    await toasts.action('Undo').click();
    await expect(followUps.markDone('Return Ruth’s ladder')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  // L2-124 AC3
  test('a tick that cannot be saved is put back, with Try again', async ({ page, pk }) => {
    await marasFollowUps(page);
    await pk.open('contactsFollowUps');
    const followUps = new ContactsFollowUpsPage(page);
    await failNetwork(
      page,
      'PUT /api/contacts/follow-ups/00000000-0000-4000-f000-000000000002/done',
    );

    await followUps.markDone('Return Ruth’s ladder').click();

    await expect(followUps.markDone('Return Ruth’s ladder')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    const toasts = new Toasts(page);
    await expect(toasts.danger).toContainText('We couldn’t save that follow-up');
    await expect(toasts.action('Try again')).toBeVisible();
  });

  // L2-142 AC1
  test('Add a follow-up adds it for nobody under Later', async ({ page, pk }) => {
    await noFollowUps(page);
    await pk.open('contactsFollowUps');
    const followUps = new ContactsFollowUpsPage(page);
    await answer(page, 'POST /api/contacts/follow-ups', {
      status: 201,
      body: {
        id: '00000000-0000-4000-f000-000000000099',
        text: 'Call Sam about the reference',
        contactId: null,
        contactFirstName: null,
        contactInitials: null,
        contactAccent: null,
        contactPhotoUrl: null,
        dueOn: null,
        isPromise: false,
        promisedVia: null,
        promisedOn: null,
        createdAt: '2026-09-15T07:40:00Z',
        doneAt: null,
      },
    });
    const request = page.waitForRequest(
      (r) => r.method() === 'POST' && r.url().endsWith('/api/contacts/follow-ups'),
    );

    await followUps.add.fill('Call Sam about the reference');
    await followUps.add.press('Enter');

    expect((await request).postDataJSON()).toMatchObject({
      text: 'Call Sam about the reference',
      contactId: null,
    });
    await expect(followUps.bucket('Later')).toContainText('Call Sam about the reference');
    await expect(followUps.add).toHaveValue('');
    await expect(followUps.sub).toHaveText('1 open');
  });
});
