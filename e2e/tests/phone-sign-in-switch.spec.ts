import { expect, test } from '../fixtures/pk-test';
import { channelsUnknown, phoneSignInOff } from '../fixtures/sign-in-channels';
import { SignInPage } from '../pages/sign-in.page';
import { SignUpPage } from '../pages/sign-up.page';
import { VerifyCodePage } from '../pages/verify-code.page';

test.describe('phone sign-in switched off', () => {
  // L2-084 AC3
  test('sign-up asks for a name and an email, with no switch to a phone', async ({ page, pk }) => {
    await phoneSignInOff(page);

    await pk.open('signUpEmailOnly');

    const signUp = new SignUpPage(page);
    await expect(signUp.name).toBeVisible();
    await expect(signUp.email).toHaveAttribute('type', 'email');
    await expect(signUp.email).toHaveAttribute('inputmode', 'email');
    await expect(signUp.email).toHaveAttribute('autocomplete', 'email');
    await expect(signUp.segmented).toHaveCount(0);
    await expect(signUp.phone).toHaveCount(0);
  });

  // L2-084 AC3
  test('sign-up sends the code to the email', async ({ page, pk }) => {
    await phoneSignInOff(page);
    await pk.open('signUpEmailOnly');
    const signUp = new SignUpPage(page);
    await signUp.name.fill('Mara');
    await signUp.email.fill('mara@hey.com');

    const asked = page.waitForRequest('**/api/auth/codes');
    await signUp.continue.click();

    expect((await asked).postDataJSON()).toEqual({
      purpose: 'SignUp',
      channel: 'Email',
      destination: 'mara@hey.com',
    });
    await expect(new VerifyCodePage(page).root).toBeVisible();
  });

  // L2-084 AC4
  test('sign-in asks for an email alone', async ({ page, pk }) => {
    await phoneSignInOff(page);

    await pk.open('signInEmailOnly');

    const signIn = new SignInPage(page);
    await expect(signIn.email).toBeFocused();
    await expect(signIn.email).toHaveAttribute('type', 'email');
    await expect(signIn.email).toHaveAttribute('inputmode', 'email');
    await expect(signIn.email).toHaveAccessibleDescription('The one you signed up with.');
    await expect(signIn.contact).toHaveCount(0);
  });

  // L2-084 AC4
  test('sign-in checks a phone number as an email, and sends no code', async ({ page, pk }) => {
    await phoneSignInOff(page);
    await pk.open('signInEmailOnly');
    const signIn = new SignInPage(page);
    let asked = false;
    page.on('request', (r) => (asked ||= r.url().endsWith('/api/auth/codes')));
    await signIn.email.fill('(415) 555-0148');

    await signIn.send.click();

    await expect(signIn.email).toHaveAttribute('aria-invalid', 'true');
    await expect(signIn.contactError).toHaveText('That email doesn’t look quite right.');
    expect(asked).toBe(false);
  });

  // L2-084 AC4
  test('sign-in with nothing typed asks for an email', async ({ page, pk }) => {
    await phoneSignInOff(page);
    await pk.open('signInEmailOnly');
    const signIn = new SignInPage(page);

    await signIn.send.click();

    await expect(signIn.contactError).toHaveText('Enter your email.');
  });
});

test.describe('phone sign-in when the API cannot say', () => {
  // L2-084 AC6
  test('sign-up and sign-in offer an email alone', async ({ page, pk }) => {
    await channelsUnknown(page);

    await pk.open('signUpEmailOnly');
    const signUp = new SignUpPage(page);
    await expect(signUp.email).toBeVisible();
    await expect(signUp.segmented).toHaveCount(0);

    await pk.open('signInEmailOnly');
    await expect(new SignInPage(page).email).toBeVisible();
  });
});
