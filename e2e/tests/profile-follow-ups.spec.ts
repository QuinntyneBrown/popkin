// Acceptance Test
// Traces to: L2-128 AC8, L2-142, known gap 115 (ruled)
// Description: A profile's Follow-ups tab counts and lists that contact's open follow-ups and adds one for them.
import { chidiProfile, contactsMorning, recordedContactId } from '../fixtures/contacts';
import { expect, test } from '../fixtures/pk-test';
import { ContactProfilePage } from '../pages/contact-profile.page';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: contactsMorning });
});

test.describe('A profile’s follow-ups', () => {
  // Gap 115: "Follow-ups {n}" counts the open follow-ups.
  test('lists Chidi’s open follow-up under Follow-ups 1', async ({ page, pk }) => {
    await chidiProfile(page);
    await pk.open('contactProfileFollowUps');
    const profile = new ContactProfilePage(page);

    await expect(profile.historyTabs).toHaveText(['Timeline', 'Follow-ups 1', 'Memories & files']);
    await expect(profile.addFollowUp).toHaveAccessibleName('Add a follow-up for Chidi');
    await expect(profile.addFollowUp).toHaveAttribute('placeholder', 'Something to do for Chidi…');
    await expect(profile.followUps).toHaveCount(1);
    await expect(profile.followUps.first()).toContainText('Ask Chidi how the commute is going');
    await expect(profile.followUps.first()).toContainText('Follow-up');
    await expect(profile.followUps.first()).toContainText('Sep 20');
  });

  // L2-142 AC1
  test('Add a follow-up for Chidi adds one for him', async ({ page, pk }) => {
    await chidiProfile(page);
    await pk.open('contactProfileFollowUps');
    const profile = new ContactProfilePage(page);
    const request = page.waitForRequest(
      (r) => r.method() === 'POST' && r.url().endsWith('/api/contacts/follow-ups'),
    );

    await profile.addFollowUp.fill('Ask Chidi how the commute is going');
    await profile.addFollowUp.press('Enter');

    expect((await request).postDataJSON()).toMatchObject({
      text: 'Ask Chidi how the commute is going',
      contactId: recordedContactId('Chidi Okafor'),
    });
  });
});
