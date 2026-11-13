import responses from '../fixtures/api/responses.json';
import { expect, test } from '../fixtures/pk-test';
import { answer, answerOnce, failNetwork, hold, problem } from '../fixtures/stubs';
import { SignInPage } from '../pages/sign-in.page';
import { VerifyCodePage } from '../pages/verify-code.page';

const sent = responses['POST /api/auth/codes'].body;
const confirmKey = `POST /api/auth/codes/${sent.verificationId}/confirm`;

test.describe('signing in', () => {
  // L2-006 AC3
  test('asks where to send the code and offers a way to sign up', async ({ page }) => {
    const signIn = new SignInPage(page);
    await signIn.open();

    await expect(signIn.heading).toHaveText('Welcome back');
    await expect(signIn.lead).toHaveText('Tell us where to send your code. Still no passwords.');
    await expect(signIn.contact).toBeFocused();
    await expect(signIn.contact).toHaveAttribute('autocomplete', 'username');
    await expect(signIn.contact).toHaveAccessibleDescription('The one you signed up with.');
    await expect(signIn.startAPopkin).toHaveAttribute('href', '/sign-up');
    await expect(signIn.back).toHaveAttribute('href', '/welcome');
  });

  // L2-006 AC1
  test('a phone number is sent a code and the code screen opens', async ({ page }) => {
    const signIn = new SignInPage(page);
    await signIn.open();

    const asked = await signIn.sendCodeTo('(415) 555-0148');

    expect(asked).toEqual({ purpose: 'SignIn', channel: 'Phone', destination: '(415) 555-0148' });
    const verify = new VerifyCodePage(page);
    await expect(verify.root).toBeVisible();
    await expect(verify.sentTo).toHaveText('We texted 6 digits to (•••) •••-••48.');
  });

  // L2-006 AC1
  test('an email is sent a code by email', async ({ page }) => {
    const signIn = new SignInPage(page);
    await signIn.open();

    const asked = await signIn.sendCodeTo(' mara@hey.com ');

    expect(asked).toEqual({ purpose: 'SignIn', channel: 'Email', destination: 'mara@hey.com' });
    await expect(new VerifyCodePage(page).root).toBeVisible();
  });

  test('Enter in the field sends the code', async ({ page }) => {
    const signIn = new SignInPage(page);
    await signIn.open();
    await signIn.contact.fill('(415) 555-0148');

    await signIn.contact.press('Enter');

    await expect(new VerifyCodePage(page).root).toBeVisible();
  });

  // L2-006 AC4, L2-003 AC5
  test('an email that cannot be right is marked invalid, and no code is sent', async ({ page }) => {
    const signIn = new SignInPage(page);
    await signIn.open();
    await signIn.contact.fill('mara@hey');

    await signIn.send.click();

    await expect(signIn.contact).toHaveAttribute('aria-invalid', 'true');
    await expect(signIn.contactError).toHaveText('That email doesn’t look quite right.');
    await expect(signIn.contact).toHaveAccessibleDescription(
      'That email doesn’t look quite right.',
    );
    await expect(signIn.contact).toBeFocused();
    await expect(signIn.contact).toHaveValue('mara@hey');
    await expect(signIn.root).toBeVisible();
  });

  // L2-006 AC4, L2-003 AC4
  test('a phone number a digit short is marked invalid', async ({ page }) => {
    const signIn = new SignInPage(page);
    await signIn.open();
    await signIn.contact.fill('(415) 555-014');

    await signIn.send.click();

    await expect(signIn.contact).toHaveAttribute('aria-invalid', 'true');
    await expect(signIn.contactError).toHaveText('That number looks a digit short.');
  });

  test('an empty field asks for a phone number or an email', async ({ page }) => {
    const signIn = new SignInPage(page);
    await signIn.open();

    await signIn.send.click();

    await expect(signIn.contactError).toHaveText('Enter your phone number or email.');
  });

  // L2-056 AC3
  test('while the code is on its way, the button says so and cannot send twice', async ({
    page,
  }) => {
    const release = await hold(page, 'POST /api/auth/codes');
    const signIn = new SignInPage(page);
    await signIn.open();
    await signIn.contact.fill('mara@hey.com');

    await signIn.send.click();

    await expect(signIn.send).toHaveText('Sending your code…');
    await expect(signIn.send).toBeDisabled();
    await expect(signIn.contact).toHaveAttribute('readonly', '');
    release();
    await expect(new VerifyCodePage(page).root).toBeVisible();
  });

  // L2-056 AC2
  test('a code that could not be sent says so and keeps what was typed', async ({ page }) => {
    await answer(page, 'POST /api/auth/codes', problem(503, 'code_not_sent'));
    const signIn = new SignInPage(page);
    await signIn.open();
    await signIn.contact.fill('mara@hey.com');

    await signIn.send.click();

    await expect(signIn.alert).toContainText('We couldn’t send your code.');
    await expect(signIn.alert).toContainText('Nothing you typed was lost.');
    await expect(signIn.contact).toHaveValue('mara@hey.com');
    await expect(signIn.send).toBeEnabled();
  });

  test('a dropped connection says the same', async ({ page }) => {
    await failNetwork(page, 'POST /api/auth/codes');
    const signIn = new SignInPage(page);
    await signIn.open();
    await signIn.contact.fill('mara@hey.com');

    await signIn.send.click();

    await expect(signIn.alert).toContainText('We couldn’t send your code.');
  });

  // L2-053 AC4
  test('too many codes says when to try again', async ({ page }) => {
    await answer(
      page,
      'POST /api/auth/codes',
      problem(429, 'code_limit_reached', { retryAfterSeconds: 600 }),
    );
    const signIn = new SignInPage(page);
    await signIn.open();
    await signIn.contact.fill('mara@hey.com');

    await signIn.send.click();

    await expect(signIn.alert).toContainText('That’s a lot of codes.');
    await expect(signIn.alert).toContainText('10 minutes');
  });

  // L2-006 AC4: what the server refuses reads as what the screen refuses
  test('a number the server refuses is marked invalid', async ({ page }) => {
    await answer(
      page,
      'POST /api/auth/codes',
      problem(400, 'phone_invalid', { field: 'destination' }),
    );
    const signIn = new SignInPage(page);
    await signIn.open();
    await signIn.contact.fill('(000) 000-0000');

    await signIn.send.click();

    await expect(signIn.contact).toHaveAttribute('aria-invalid', 'true');
    await expect(signIn.contactError).toHaveText('That number looks a digit short.');
  });
});

test.describe('after the code', () => {
  // L2-006 AC1, L2-007 AC1
  test('the right code opens My Popkins', async ({ page }) => {
    const verify = new VerifyCodePage(page);
    await verify.reachBySignIn();

    await verify.type('482913');

    await expect(page).toHaveURL(/\/popkins$/);
  });

  // L2-007 AC2
  test('the right code opens the screen that was asked for', async ({ page }) => {
    const verify = new VerifyCodePage(page);
    await verify.reachBySignIn('/new');

    await verify.type('482913');

    await expect(page).toHaveURL(/\/new$/);
  });

  test('a return URL to another site is ignored', async ({ page }) => {
    const verify = new VerifyCodePage(page);
    await verify.reachBySignIn('//evil.example/steal');

    await verify.type('482913');

    await expect(page).toHaveURL(/\/popkins$/);
  });

  test('Use a different number goes back to sign in with what was typed', async ({ page }) => {
    const verify = new VerifyCodePage(page);
    await verify.reachBySignIn('/new');

    await verify.differentNumber.click();

    const signIn = new SignInPage(page);
    await expect(signIn.root).toBeVisible();
    await expect(signIn.contact).toHaveValue('(415) 555-0148');
    await expect(page).toHaveURL(/returnUrl=%2Fnew$/);
  });

  // L2-006 AC3: the way to sign up carries the screen asked for
  test('Start a Popkin keeps the screen that was asked for', async ({ page }) => {
    const signIn = new SignInPage(page);
    await signIn.open('/new');

    await expect(signIn.startAPopkin).toHaveAttribute('href', '/sign-up?returnUrl=%2Fnew');
  });
});

test.describe('signing in with no account yet', () => {
  const nameRequired = { outcome: 'NameRequired', session: null, isNewPerson: true };

  // L2-006 AC2
  test('asks for a name once the code is confirmed, then signs the person in', async ({ page }) => {
    await answerOnce(page, confirmKey, { status: 200, body: nameRequired });
    const verify = new VerifyCodePage(page);
    await verify.reachBySignIn();
    await verify.type('482913');

    await expect(verify.heading).toHaveText('What should we call you?');
    await expect(verify.name).toBeFocused();
    await verify.name.fill('Mara');
    const [request] = await Promise.all([
      page.waitForRequest((r) => r.url().endsWith('/confirm')),
      verify.continue.click(),
    ]);

    expect(request.postDataJSON()).toEqual({ code: '482913', name: 'Mara' });
    await expect(page).toHaveURL(/\/popkins$/);
  });

  test('an empty name is marked invalid and nothing is sent', async ({ page }) => {
    await answerOnce(page, confirmKey, { status: 200, body: nameRequired });
    const verify = new VerifyCodePage(page);
    await verify.reachBySignIn();
    await verify.type('482913');

    await verify.continue.click();

    await expect(verify.name).toHaveAttribute('aria-invalid', 'true');
    await expect(verify.nameError).toHaveText('Enter a name so people know who you are.');
    await expect(verify.name).toBeFocused();
  });

  // L2-056 AC3
  test('while signing in, Continue says so and is disabled', async ({ page }) => {
    await answerOnce(page, confirmKey, { status: 200, body: nameRequired });
    const verify = new VerifyCodePage(page);
    await verify.reachBySignIn();
    await verify.type('482913');
    await expect(verify.name).toBeVisible();
    await hold(page, confirmKey);
    await verify.name.fill('Mara');

    await verify.continue.click();

    await expect(verify.continue).toHaveText('Signing you in…');
    await expect(verify.continue).toBeDisabled();
  });

  // L2-004 AC4: the name must arrive within the code's ten minutes
  test('a code that expired while the name was typed asks for a new one', async ({ page }) => {
    await answerOnce(page, confirmKey, { status: 200, body: nameRequired });
    const verify = new VerifyCodePage(page);
    await verify.reachBySignIn();
    await verify.type('482913');
    await expect(verify.name).toBeVisible();
    await answer(page, confirmKey, problem(410, 'code_expired'));
    await verify.name.fill('Mara');

    await verify.continue.click();

    await expect(verify.heading).toHaveText('Enter your code');
    await expect(verify.codeError).toHaveText('That code has expired.');
  });
});
