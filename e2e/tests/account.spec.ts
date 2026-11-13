import {
  anAccountWithEmail,
  theAccountFailing,
  theAccountFailingOnce,
  theAccountLoading,
  theMockAccount,
} from '../fixtures/account';
import { expect, test } from '../fixtures/pk-test';
import { AccountPage } from '../pages/account.page';
import { MyPopkinsPage } from '../pages/my-popkins.page';

test.describe('the account screen', () => {
  // L2-048 AC1
  test('shows the photo, the name and the read-only number the person signs in with', async ({
    page,
    pk,
  }) => {
    await theMockAccount(page);
    await pk.open('account');
    const account = new AccountPage(page);

    await expect(account.root).toBeVisible();
    await expect(page).toHaveTitle('Your account · Popkin');
    await expect(account.heading).toHaveText('Your account');
    await expect(account.photoPreview).toBeVisible();
    await expect(account.name).toHaveValue('Mara Okafor');
    await expect(account.name).toHaveAttribute('maxlength', '40');
    await expect(account.nameHint).toHaveText('This is how you appear in every Popkin.');
    await expect(account.contact).toHaveAccessibleName('Phone number');
    await expect(account.contact).toHaveValue('(415) 555-0148');
    await expect(account.contact).toHaveAttribute('readonly', '');
    await expect(account.contactHint).toBeVisible();
    await expect(account.themeOption('Match my device')).toHaveAttribute('aria-checked', 'true');
    await expect(account.save).toBeEnabled();
    await expect(account.signOut).toBeVisible();
    await expect(account.deleteAccount).toBeVisible();
    await expect(account.back).toHaveAttribute('href', '/popkins');
  });

  // L2-048 AC1
  test('without a photo it shows the initials; an email reads as the email', async ({
    page,
    pk,
  }) => {
    await anAccountWithEmail(page);
    await pk.open('account');
    const account = new AccountPage(page);

    await expect(account.initials).toHaveText('WB');
    await expect(account.photoPreview).toHaveCount(0);
    await expect(account.contact).toHaveAccessibleName('Email');
    await expect(account.contact).toHaveValue('walt@example.com');
  });

  // L2-048 AC1; the avatar of My Popkins leads here
  test('opens from the avatar of My Popkins', async ({ page, pk }) => {
    await pk.open('myPopkins');

    await new MyPopkinsPage(page).account.click();

    await expect(page).toHaveURL('/account');
    await expect(new AccountPage(page).root).toBeVisible();
  });

  // L2-056 AC1
  test('says it is loading while the account is on its way', async ({ page, pk }) => {
    const release = await theAccountLoading(page);
    await pk.open('account');
    const account = new AccountPage(page);

    await expect(account.loading).toBeAttached();
    await expect(account.name).toHaveCount(0);
    release();
    await expect(account.name).toHaveValue('Mara Okafor');
  });

  // L2-056 AC2
  test('says when the account cannot be loaded, and offers My Popkins', async ({ page, pk }) => {
    await theAccountFailing(page);
    await pk.open('account');
    const account = new AccountPage(page);

    await expect(account.error).toBeVisible();
    await expect(account.myPopkins).toHaveAttribute('href', '/popkins');
  });

  // L2-056 AC2
  test('"Try again" loads the account again', async ({ page, pk }) => {
    await theAccountFailingOnce(page);
    await pk.open('account');
    const account = new AccountPage(page);
    await expect(account.error).toBeVisible();

    await account.tryAgain.click();

    await expect(account.name).toHaveValue('Mara Okafor');
  });
});
