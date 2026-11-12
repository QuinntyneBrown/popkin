import { expect, test } from '../fixtures/pk-test';
import { SignUpPage } from '../pages/sign-up.page';

test.describe('signing up', () => {
  // L2-003 AC1, AC7
  test('asks for a name and a phone number, with the Terms and Privacy as links', async ({
    page,
    pk,
  }) => {
    await pk.open('signUp');

    const signUp = new SignUpPage(page);
    await expect(signUp.root).toBeVisible();
    await expect(signUp.heading).toHaveText('First, what should we call you?');
    await expect(signUp.name).toBeVisible();
    await expect(signUp.phone).toBeVisible();
    await expect(signUp.phoneTab).toHaveAttribute('aria-selected', 'true');
    await expect(signUp.emailTab).toHaveAttribute('aria-selected', 'false');
    await expect(signUp.legal).toHaveText('By continuing you agree to the Terms and Privacy.');
    await expect(signUp.terms).toBeVisible();
    await expect(signUp.privacy).toBeVisible();
  });

  // L2-003 AC2
  test('switching to Email relabels the field for an email address and keeps the name', async ({
    page,
    pk,
  }) => {
    await pk.open('signUp');
    const signUp = new SignUpPage(page);
    await signUp.name.fill('Mara');

    await signUp.emailTab.click();

    await expect(signUp.emailTab).toHaveAttribute('aria-selected', 'true');
    await expect(signUp.email).toHaveAttribute('type', 'email');
    await expect(signUp.email).toHaveAttribute('inputmode', 'email');
    await expect(signUp.email).toHaveAttribute('autocomplete', 'email');
    await expect(signUp.phone).toHaveCount(0);
    await expect(signUp.name).toHaveValue('Mara');
  });

  test('the switch moves with the arrow keys', async ({ page, pk }) => {
    await pk.open('signUp');
    const signUp = new SignUpPage(page);

    await signUp.phoneTab.focus();
    await page.keyboard.press('ArrowRight');

    await expect(signUp.emailTab).toBeFocused();
    await expect(signUp.emailTab).toHaveAttribute('aria-selected', 'true');
  });

  // L2-003 AC4
  test('a phone number a digit short is marked invalid and announced, and no code is sent', async ({
    page,
    pk,
  }) => {
    await pk.open('signUp');
    const signUp = new SignUpPage(page);
    await signUp.fill('Mara', '(415) 555-014');

    await signUp.submit();

    await expect(signUp.phone).toHaveAttribute('aria-invalid', 'true');
    await expect(signUp.contactError).toHaveText('That number looks a digit short.');
    await expect(signUp.phone).toHaveAccessibleDescription('That number looks a digit short.');
    await expect(signUp.summary).toHaveAttribute('role', 'alert');
    await expect(signUp.summary).toContainText('One thing to fix');
    await expect(signUp.summary).toContainText('Phone number: that number looks a digit short.');
    await expect(signUp.summary).toBeFocused();
    await expect(page).toHaveURL(/\/sign-up$/);
  });

  // L2-003 AC5
  test('an email without a valid address is marked invalid and announced', async ({ page, pk }) => {
    await pk.open('signUp');
    const signUp = new SignUpPage(page);
    await signUp.fill('Mara', 'mara@hey', 'email');

    await signUp.submit();

    await expect(signUp.email).toHaveAttribute('aria-invalid', 'true');
    await expect(signUp.contactError).toHaveText('That email doesn’t look quite right.');
    await expect(signUp.summary).toContainText('Email: that email doesn’t look quite right.');
  });

  // L2-003 AC6
  test('an empty name is marked invalid with a message to enter one', async ({ page, pk }) => {
    await pk.open('signUp');
    const signUp = new SignUpPage(page);
    await signUp.fill('   ', '(415) 555-0148');

    await signUp.submit();

    await expect(signUp.name).toHaveAttribute('aria-invalid', 'true');
    await expect(signUp.nameError).toHaveText('Enter a name so people know who you are.');
    await expect(signUp.summary).toContainText(
      'Your name: enter a name so people know who you are.',
    );
  });

  test('two problems are counted in the summary, and each link moves to its field', async ({
    page,
    pk,
  }) => {
    await pk.open('signUp');
    const signUp = new SignUpPage(page);
    await signUp.fill('', '415');

    await signUp.submit();

    await expect(signUp.summary).toContainText('2 things to fix');
    await signUp.summary.getByRole('link', { name: /Phone number/ }).click();
    await expect(signUp.phone).toBeFocused();
  });
});
