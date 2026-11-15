import { atTheRecording, confirmKey, signedOutOfTheConsole } from '../../fixtures/admin';
import { expect, test } from '../../fixtures/pk-test';
import { routes } from '../../fixtures/routes';
import { answer, problem } from '../../fixtures/stubs';
import { AuditPage } from '../../pages/admin/audit.page';
import { NotAnAdminPage } from '../../pages/admin/not-an-admin.page';
import { AdminSignInPage } from '../../pages/admin/sign-in.page';

test.describe('Admin sign in (L2-088)', () => {
  test.use({ timezoneId: 'Europe/London' });
  test.beforeEach(async ({ page }) => {
    await atTheRecording(page);
    await signedOutOfTheConsole(page);
  });

  // Given no admin session, when Lena opens the audit log, then the sign-in opens; when she gives
  // her staff email and the code sent to it, then the page she asked for opens (L2-088 AC1, AC4).
  test('signs in with a code and opens the page that was asked for', async ({ page, pk }) => {
    const signIn = new AdminSignInPage(page);
    const audit = new AuditPage(page);

    await pk.open('adminAudit');
    await expect(signIn.root).toBeVisible();
    await expect(signIn.heading).toHaveText('Sign in to the console');
    await expect(signIn.email).toBeFocused();
    await signIn.email.fill('lena@popkin.app');
    await signIn.sendCode.click();

    await expect(signIn.heading).toHaveText('Enter your code');
    await expect(signIn.lead).toHaveText(
      'Sent to lena.fischer@popkin.app. It works for 10 minutes.',
    );
    await expect(signIn.code).toBeFocused();
    await signIn.code.fill('482913');

    await expect(audit.root).toBeVisible();
    await expect(page).toHaveURL(/\/audit$/);
    await expect(audit.shell.me).toContainText('Lena Fischer');
  });

  // Given an address with no ending, when it is sent, then nothing is sent and the field says
  // how to fix it (L2-088 AC2).
  test('asks for a whole email address before sending anything', async ({ page, pk }) => {
    const signIn = new AdminSignInPage(page);
    await pk.open('adminSignIn');

    await signIn.email.fill('lena@popkin');
    await signIn.sendCode.click();

    await expect(signIn.alert).toContainText('Check your email address');
    await expect(signIn.alert).toContainText('Staff email is missing its ending');
    await expect(signIn.emailError).toHaveText(
      'Enter a whole email address, like name@popkin.app.',
    );
    await expect(signIn.email).toHaveAttribute('aria-invalid', 'true');
    await expect(signIn.heading).toHaveText('Sign in to the console');
  });

  // Given a wrong code, when it is entered, then the screen says how many tries are left; "Use
  // another email" returns to the email with it kept (L2-088 AC5, AC7).
  test('counts the tries left after a wrong code', async ({ page, pk }) => {
    const signIn = new AdminSignInPage(page);
    await answer(page, confirmKey, problem(400, 'code_mismatch', { attemptsLeft: 2 }));
    await pk.open('adminSignIn');
    await signIn.email.fill('lena@popkin.app');
    await signIn.sendCode.click();

    await signIn.code.fill('481207');

    await expect(signIn.codeError).toHaveText(
      'That code doesn’t match. 2 tries left before the console locks for 15 minutes.',
    );
    await expect(signIn.code).toHaveAttribute('aria-invalid', 'true');
    await signIn.useAnotherEmail.click();
    await expect(signIn.heading).toHaveText('Sign in to the console');
    await expect(signIn.email).toHaveValue('lena@popkin.app');
  });

  // Given three wrong codes, when the console locks, then the code can't be entered and the
  // screen says when to try again (L2-088 AC6).
  test('locks after three wrong codes', async ({ page, pk }) => {
    const signIn = new AdminSignInPage(page);
    await answer(
      page,
      confirmKey,
      problem(429, 'admin_locked', { lockedUntil: '2026-07-14T09:57:00Z' }),
    );
    await pk.open('adminSignIn');
    await signIn.email.fill('lena@popkin.app');
    await signIn.sendCode.click();

    await signIn.code.fill('000000');

    await expect(signIn.alert).toContainText('Too many wrong codes');
    await expect(signIn.alert).toContainText(
      'Try again at 10:57, or ask an Owner to check your account.',
    );
    await expect(signIn.code).toBeDisabled();
    await expect(signIn.signIn).toBeDisabled();
    await expect(signIn.sendNewCode).toBeDisabled();
  });

  // Given a code that is right but not an admin's, when it is entered, then the screen says so and
  // leads to Popkin or back to the sign-in (L2-078 AC2).
  test('turns away a person who is not an admin', async ({ page, pk }) => {
    const signIn = new AdminSignInPage(page);
    const notAnAdmin = new NotAnAdminPage(page);
    await answer(page, confirmKey, problem(403, 'not_an_admin'));
    await pk.open('adminSignIn');
    await signIn.email.fill('mara@hey.com');
    await signIn.sendCode.click();

    await signIn.code.fill('482913');

    await expect(notAnAdmin.root).toBeVisible();
    await expect(notAnAdmin.heading).toHaveText('This account isn’t an admin');
    await expect(notAnAdmin.goToPopkin).toHaveAttribute('href', 'http://localhost:4200');
    await notAnAdmin.tryAnotherEmail.click();
    await expect(signIn.root).toBeVisible();
  });

  // Given an admin session, when the sign-in is opened, then the console opens instead.
  test('sends a signed-in admin to the console', async ({ page }) => {
    await page.unroute('**/api/admin/**');
    await page.goto(routes.adminSignIn.app);

    await expect(new AuditPage(page).root).toBeVisible();
  });
});
