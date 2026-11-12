import responses from '../fixtures/api/responses.json';
import { codeSentAt } from '../fixtures/journeys';
import { expect, test } from '../fixtures/pk-test';
import { answer, hold, problem } from '../fixtures/stubs';
import { SignUpPage } from '../pages/sign-up.page';
import { VerifyCodePage } from '../pages/verify-code.page';

const sent = responses['POST /api/auth/codes'].body;
const confirmKey = `POST /api/auth/codes/${sent.verificationId}/confirm`;
const resendKey = `POST /api/auth/codes/${sent.verificationId}/resend`;
const sentAt = codeSentAt;

test.describe('confirming the code', () => {
  // L2-004 AC1
  test('names the masked number the code went to', async ({ page }) => {
    const verify = new VerifyCodePage(page);
    await verify.reach();

    await expect(verify.heading).toHaveText('Enter your code');
    await expect(verify.sentTo).toHaveText('We texted 6 digits to (•••) •••-••48.');
    await expect(verify.code).toBeFocused();
    await expect(verify.code).toHaveAttribute('autocomplete', 'one-time-code');
    await expect(verify.code).toHaveAttribute('inputmode', 'numeric');
  });

  // L2-004 AC2, L2-007: signed in, the next step of the journey opens without a further tap
  test('six right digits sign the person in and open Name your Popkin', async ({ page }) => {
    const verify = new VerifyCodePage(page);
    await verify.reach();

    await verify.type('482913');

    await expect(page).toHaveURL(/\/new$/);
  });

  test('a return URL from the invite journey is the next step', async ({ page }) => {
    const verify = new VerifyCodePage(page);
    await verify.reach('/i/lakeside');

    await verify.type('482913');

    await expect(page).toHaveURL(/\/i\/lakeside$/);
  });

  test('a return URL to another site is ignored', async ({ page }) => {
    const verify = new VerifyCodePage(page);
    await verify.reach('//evil.example/steal');

    await verify.type('482913');

    await expect(page).toHaveURL(/\/new$/);
  });

  // L2-056 AC3
  test('while checking, Confirm reads "Checking…" and is disabled', async ({ page }) => {
    const verify = new VerifyCodePage(page);
    await hold(page, confirmKey);
    await verify.reach();

    await verify.type('482913');

    await expect(verify.confirm).toHaveText('Checking…');
    await expect(verify.confirm).toBeDisabled();
  });

  // L2-004 AC5
  test('a pasted code is submitted as if typed', async ({ page }) => {
    const verify = new VerifyCodePage(page);
    await verify.reach();

    await verify.code.fill('482913');

    await expect(page).toHaveURL(/\/new$/);
  });

  // L2-004 AC6
  test('anything other than a digit is ignored', async ({ page }) => {
    const verify = new VerifyCodePage(page);
    await verify.reach();

    await verify.type('4a8-2 9');

    await expect(verify.code).toHaveValue('4829');
  });

  // L2-004 AC3
  test('six wrong digits clear the field, mark it invalid and say how many tries are left', async ({
    page,
  }) => {
    const verify = new VerifyCodePage(page);
    await answer(page, confirmKey, problem(400, 'code_mismatch', { attemptsLeft: 4 }));
    await verify.reach();

    await verify.type('111111');

    await expect(verify.code).toHaveValue('');
    await expect(verify.code).toHaveAttribute('aria-invalid', 'true');
    await expect(verify.codeError).toHaveText('That code doesn’t match. Try again. 4 tries left.');
    await expect(verify.codeError).toHaveAttribute('role', 'alert');
    await expect(verify.code).toBeFocused();
  });

  // L2-004 AC4
  test('an expired code is refused with a way to send a new one', async ({ page }) => {
    const verify = new VerifyCodePage(page);
    await answer(page, confirmKey, problem(400, 'code_expired'));
    await verify.reach();

    await verify.type('482913');

    await expect(verify.codeError).toHaveText('That code has expired.');
    await expect(verify.resend).toHaveText('Send a new code');
    await expect(verify.resend).toBeEnabled();
  });

  // L2-005 AC3
  test('after five wrong codes a new code is needed', async ({ page }) => {
    const verify = new VerifyCodePage(page);
    await answer(page, confirmKey, problem(400, 'code_attempts_exhausted'));
    await verify.reach();

    await verify.type('482913');

    await expect(verify.codeError).toHaveText('Too many tries. Send a new code to try again.');
    await expect(verify.resend).toBeEnabled();
  });

  // L2-005 AC5
  test('a code that was used already needs a new one', async ({ page }) => {
    const verify = new VerifyCodePage(page);
    await answer(page, confirmKey, problem(400, 'code_used'));
    await verify.reach();

    await verify.type('482913');

    await expect(verify.codeError).toHaveText('That code has been used. Send a new code.');
  });

  test('Use a different number goes back to sign up with the name kept', async ({ page }) => {
    const verify = new VerifyCodePage(page);
    await verify.reach();

    await verify.differentNumber.click();

    const signUp = new SignUpPage(page);
    await expect(signUp.root).toBeVisible();
    await expect(signUp.name).toHaveValue('Mara');
  });

  test('without a code on its way the code screen sends the person to sign in', async ({
    page,
  }) => {
    await page.goto('/verify');

    await expect(page).toHaveURL(/\/sign-in$/);
  });
});

test.describe('sending a new code', () => {
  // L2-005 AC1
  test('Send a new code is disabled and counts down until 30 seconds have passed', async ({
    page,
  }) => {
    await page.clock.install({ time: sentAt });
    const verify = new VerifyCodePage(page);
    await verify.reach();

    await expect(verify.resend).toHaveText('Send a new code in 0:30');
    await expect(verify.resend).toBeDisabled();
    await page.clock.runFor(6_000);
    await expect(verify.resend).toHaveText('Send a new code in 0:24');
    await page.clock.runFor(24_000);
    await expect(verify.resend).toHaveText('Send a new code');
    await expect(verify.resend).toBeEnabled();
  });

  // L2-005 AC2, L2-056 AC7
  test('a new code is sent and a message confirms it', async ({ page }) => {
    await page.clock.install({ time: sentAt });
    const verify = new VerifyCodePage(page);
    await verify.reach();
    await page.clock.runFor(30_000);

    await verify.resend.click();

    await expect(verify.toast).toContainText('New code sent');
    await expect(verify.resend).toBeDisabled();
    await expect(verify.resend).toHaveText(/Send a new code in 0:\d\d/);
  });

  // L2-005 AC4
  test('a new code refused for the hourly limit says when to try again', async ({ page }) => {
    await page.clock.install({ time: sentAt });
    await answer(page, resendKey, problem(429, 'code_limit_reached', { retryAfterSeconds: 1200 }));
    const verify = new VerifyCodePage(page);
    await verify.reach();
    await page.clock.runFor(30_000);

    await verify.resend.click();

    await expect(verify.codeError).toHaveText('That’s a lot of codes. Try again in 20 minutes.');
  });
});
