import path from 'node:path';
import {
  anAccountWithEmail,
  anAccountWithoutAPhoto,
  savedAs,
  savedWithAPhoto,
  theAccountFailing,
  theAccountFailingOnce,
  theAccountLoading,
  theMockAccount,
} from '../fixtures/account';
import { expect, test } from '../fixtures/pk-test';
import { answer, hold, problem } from '../fixtures/stubs';
import { AccountPage } from '../pages/account.page';
import { MyPopkinsPage } from '../pages/my-popkins.page';

const portrait = path.join(__dirname, '../../docs/mocks/assets/images/call3.jpg');

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

test.describe('saving changes', () => {
  // L2-048 AC2
  test('a new name is saved, a message says so, and it shows on My Popkins', async ({
    page,
    pk,
  }) => {
    await theMockAccount(page);
    await savedAs(page, 'Mara O.');
    const release = await hold(page, 'PATCH /api/account');
    await pk.open('account');
    const account = new AccountPage(page);

    await account.name.fill('Mara O.');
    await account.save.click();

    await expect(account.saving).toBeDisabled();
    await expect(account.name).toHaveAttribute('readonly', '');
    release();
    await expect(account.saved).toBeVisible();
    await expect(account.name).toHaveValue('Mara O.');
    await account.back.click();
    await expect(new MyPopkinsPage(page).account).toHaveAccessibleName('Your account, Mara O.');
  });

  // L2-048 AC2
  test('a new photo is uploaded and shown', async ({ page, pk }) => {
    await anAccountWithoutAPhoto(page);
    await savedWithAPhoto(page);
    await savedAs(page, 'Mara O.');
    await pk.open('account');
    const account = new AccountPage(page);
    await expect(account.initials).toHaveText('MO');

    await account.choosePhoto(portrait);
    await expect(account.photoPreview).toBeVisible();
    const upload = page.waitForRequest('**/api/account/photo');
    await account.save.click();

    expect((await upload).method()).toBe('PUT');
    await expect(account.saved).toBeVisible();
    await expect(account.photoPreview).toBeVisible();
    let again = false;
    page.on('request', (request) => {
      if (request.url().endsWith('/api/account/photo')) again = true;
    });
    await account.name.fill('Mara O.');
    await account.save.click();
    await expect(account.saved).toBeVisible();
    expect(again).toBe(false);
  });

  // L2-048 AC3
  test('an empty name saves nothing and is marked invalid with a message', async ({ page, pk }) => {
    await pk.open('account');
    const account = new AccountPage(page);
    let sent = false;
    page.on('request', (request) => {
      if (request.method() === 'PATCH') sent = true;
    });

    await account.name.fill('   ');
    await account.save.click();

    await expect(account.summary).toBeFocused();
    await expect(account.summary).toContainText('One thing to fix');
    await expect(account.summary.getByRole('link')).toHaveText(
      'Your name: enter a name so people know who you are.',
    );
    await expect(account.name).toHaveAttribute('aria-invalid', 'true');
    await expect(account.nameError).toHaveText('Enter a name so people know who you are.');
    await expect(account.saved).toHaveCount(0);
    expect(sent).toBe(false);
  });

  test('a photo the API refuses says why, and keeps the name typed', async ({ page, pk }) => {
    await answer(page, 'PUT /api/account/photo', problem(400, 'photo_too_large'));
    await pk.open('account');
    const account = new AccountPage(page);

    await account.name.fill('Mara O.');
    await account.choosePhoto(portrait);
    await account.save.click();

    await expect(account.photoError).toHaveText('That photo is over 10 MB. Choose a smaller one.');
    await expect(account.name).toHaveValue('Mara O.');
    await expect(account.save).toBeEnabled();
  });

  test('a save that fails keeps what was typed and can be tried again', async ({ page, pk }) => {
    await answer(page, 'PATCH /api/account', problem(500, 'unexpected'));
    await pk.open('account');
    const account = new AccountPage(page);

    await account.name.fill('Mara O.');
    await account.save.click();

    await expect(account.failed).toContainText('We couldn’t save that.');
    await expect(account.name).toHaveValue('Mara O.');
    await expect(account.save).toBeEnabled();
  });
});

test.describe('the theme', () => {
  // L2-048 AC4, L2-059 AC1
  test('a chosen theme is taken at once and remembered on the device', async ({ page, pk }) => {
    await pk.open('account');
    const account = new AccountPage(page);
    expect(await account.drawnTheme()).toBeNull();

    await account.themeOption('Dark').click();

    await expect(account.themeOption('Dark')).toHaveAttribute('aria-checked', 'true');
    await expect(account.themeOption('Match my device')).toHaveAttribute('aria-checked', 'false');
    expect(await account.drawnTheme()).toBe('dark');
    await page.reload();
    await expect(account.themeOption('Dark')).toHaveAttribute('aria-checked', 'true');
    expect(await account.drawnTheme()).toBe('dark');
    await account.themeOption('Match my device').click();
    expect(await account.drawnTheme()).toBeNull();
  });

  // L2-048 AC4: with the keyboard
  test('the arrow keys move through the themes and choose them', async ({ page, pk }) => {
    await pk.open('account');
    const account = new AccountPage(page);

    await account.themeOption('Match my device').focus();
    await page.keyboard.press('ArrowRight');

    await expect(account.themeOption('Light')).toBeFocused();
    await expect(account.themeOption('Light')).toHaveAttribute('aria-checked', 'true');
    expect(await account.drawnTheme()).toBe('light');
  });
});
