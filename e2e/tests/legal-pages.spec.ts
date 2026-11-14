import { expect, test } from '../fixtures/pk-test';
import { LegalDocumentPage } from '../pages/legal-document.page';
import { SignUpPage } from '../pages/sign-up.page';

// Traces to: L2-082
test.describe('the Privacy notice', () => {
  test('opens at /privacy for anyone, without a request to the API', async ({ page, pk }) => {
    const api: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname.startsWith('/api/')) api.push(request.url());
    });
    await pk.open('privacy');

    const privacy = new LegalDocumentPage(page, 'privacy');
    await expect(privacy.root).toBeVisible();
    await expect(privacy.heading).toHaveText('Privacy notice');
    await expect(privacy.updated).toHaveText('Last updated 14 November 2026');
    await expect(page).toHaveTitle('Privacy notice · Popkin');
    expect(api).toEqual([]);
  });

  test('says what is collected, the one use of a phone number and who handles it', async ({
    page,
    pk,
  }) => {
    await pk.open('privacy');

    const privacy = new LegalDocumentPage(page, 'privacy');
    const collected = privacy.section('What we collect');
    await expect(collected).toContainText('Your name and the photo you choose');
    await expect(collected).toContainText('The phone number or email you sign in with');
    await expect(collected).toContainText('messages, photos, comments, reactions, experiences');

    const phone = privacy.section('How we use your phone number');
    await expect(phone).toContainText(
      'Your phone number is used only to send you one-time sign-in codes and group invites.',
    );
    await expect(phone).toContainText(
      'Mobile numbers and SMS opt-in data are never sold, and never shared with third parties',
    );

    const handlers = privacy.section('Who handles it for us');
    await expect(handlers).toContainText('Azure Communication Services');
    await expect(handlers).toContainText('Azure Blob Storage');
  });

  test('says how to delete the account, who to contact, and links to the Terms', async ({
    page,
    pk,
  }) => {
    await pk.open('privacy');

    const privacy = new LegalDocumentPage(page, 'privacy');
    const deletion = privacy.section('Delete your account');
    await expect(deletion).toContainText('“Delete my account”');
    await expect(deletion).toContainText('erased within 30 days');
    await expect(privacy.section('Who we are')).toContainText('Popkin is run by');
    await expect(privacy.section('Contact')).toContainText('write to');
    await expect(privacy.prose).not.toContainText(/\bfree\b/i);

    await privacy.otherPage.click();
    await expect(new LegalDocumentPage(page, 'terms').heading).toHaveText('Terms');
    await expect(page).toHaveURL(/\/terms$/);
  });
});

// Traces to: L2-083
test.describe('the Terms', () => {
  test('open at /terms with how Popkin texts, its rates, STOP and HELP', async ({ page, pk }) => {
    await pk.open('terms');

    const terms = new LegalDocumentPage(page, 'terms');
    await expect(terms.root).toBeVisible();
    await expect(terms.heading).toHaveText('Terms');
    await expect(terms.updated).toHaveText('Last updated 14 November 2026');
    await expect(page).toHaveTitle('Terms · Popkin');

    const sms = terms.section('Text messages (SMS)');
    await expect(sms).toContainText('only when you ask for a sign-in code');
    await expect(sms).toContainText('occasional group invites');
    await expect(sms).toContainText('Message and data rates may apply.');
    await expect(sms).toContainText('Reply STOP to stop the texts. Reply HELP for help.');
  });

  test('never say Popkin is free, and link to the Privacy notice', async ({ page, pk }) => {
    await pk.open('terms');

    const terms = new LegalDocumentPage(page, 'terms');
    await expect(terms.section('Paying')).toContainText(
      'Nothing is ever charged without your agreement.',
    );
    await expect(terms.section('What you share')).toContainText('stays yours');
    await expect(terms.section('Ending')).toContainText('delete your account at any time');
    await expect(terms.section('Contact')).toContainText('Questions about these Terms');
    await expect(terms.prose).not.toContainText(/\bfree\b/i);

    await terms.otherPage.click();
    await expect(new LegalDocumentPage(page, 'privacy').heading).toHaveText('Privacy notice');
  });

  test('are reached from the sign-up screen, as is the Privacy notice', async ({ page, pk }) => {
    await pk.open('signUp');
    const signUp = new SignUpPage(page);
    await signUp.terms.click();
    await expect(new LegalDocumentPage(page, 'terms').root).toBeVisible();

    await page.goBack();
    await signUp.privacy.click();
    await expect(new LegalDocumentPage(page, 'privacy').root).toBeVisible();
  });

  test('keep one column at 360 px, with nothing to scroll sideways', async ({ page, pk }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    for (const which of ['terms', 'privacy'] as const) {
      await pk.open(which);
      await expect(new LegalDocumentPage(page, which).heading).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBe(0);
    }
  });
});
