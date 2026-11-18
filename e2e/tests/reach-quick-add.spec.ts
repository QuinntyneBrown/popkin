// Acceptance Test
// Traces to: L2-177
// Description: Quick Add opens from the shortcuts of Popkin's web app manifest, and a signed-out person signs in first and lands on it.
import { expect, test } from '../fixtures/pk-test';
import { answerOnce, problem } from '../fixtures/stubs';
import { ContactsTodayPage } from '../pages/contacts-today.page';
import { QuickAddPage } from '../pages/quick-add.page';
import { SignInPage } from '../pages/sign-in.page';
import { VerifyCodePage } from '../pages/verify-code.page';

interface Manifest {
  shortcuts: { name: string; url: string }[];
}

test.describe('Reach Quick Add', () => {
  // L2-177 AC1: the phone lists the manifest's shortcuts; each opens its screen.
  test('the shortcuts on Popkin’s icon are Add someone and Contacts', async ({ page, pk }) => {
    const manifest = (await (await page.request.get('/manifest.webmanifest')).json()) as Manifest;

    expect(manifest.shortcuts.map(({ name, url }) => ({ name, url }))).toEqual([
      { name: 'Add someone', url: '/contacts/quick-add' },
      { name: 'Contacts', url: '/contacts' },
    ]);
    await pk.open('quickAdd');
    await expect(new QuickAddPage(page).heading).toHaveText('Add someone');
    await page.goto(manifest.shortcuts[1].url);
    await expect(new ContactsTodayPage(page).root).toBeVisible();
  });

  // L2-177 AC1: the page names the manifest, so the browser can install Popkin.
  test('the web app links its manifest', async ({ page, pk }) => {
    await pk.open('quickAdd');

    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
      'href',
      'manifest.webmanifest',
    );
  });

  // L2-177 AC3
  test('signed out, sign-in shows first and Quick Add opens once signed in', async ({ page }) => {
    await answerOnce(page, 'GET /api/auth/session', problem(401, 'unauthorized'));

    await page.goto('/contacts/quick-add');

    await expect(new SignInPage(page).root).toBeVisible();
    await expect(page).toHaveURL(`/sign-in?returnUrl=${encodeURIComponent('/contacts/quick-add')}`);
    await new SignInPage(page).sendCodeTo('(415) 555-0148');
    await new VerifyCodePage(page).type('482913');
    await expect(page).toHaveURL('/contacts/quick-add');
    await expect(new QuickAddPage(page).name).toBeFocused();
  });
});
