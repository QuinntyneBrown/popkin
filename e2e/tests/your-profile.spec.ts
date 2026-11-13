import path from 'node:path';
import responses from '../fixtures/api/responses.json';
import {
  asJoel,
  asMemberOfLakeside,
  asVisitor,
  inviteCode,
  joinKey,
  lakesideCast,
  membersKey,
  wrappedUpInvite,
} from '../fixtures/journeys';
import { expect, test } from '../fixtures/pk-test';
import { answer, answerOnce, hold, problem } from '../fixtures/stubs';
import { YourProfilePage } from '../pages/your-profile.page';

const created = responses['POST /api/popkins'].body;
const portrait = path.join(__dirname, '../../docs/mocks/assets/images/call3.jpg');

test.describe('the profile step', () => {
  test.beforeEach(async ({ page }) => {
    await asJoel(page);
  });

  // L2-013 AC1
  test('asks how people should know you, with your account name and an optional photo', async ({
    page,
    pk,
  }) => {
    await pk.open('yourProfile');
    const profile = new YourProfilePage(page);

    await expect(profile.root).toBeVisible();
    await expect(profile.heading).toHaveText('How should people know you?');
    await expect(profile.popkin).toHaveText('🏕️ Lakeside Weekend');
    await expect(profile.screen).toHaveAttribute('data-accent', 'teal');
    await expect(profile.name).toHaveValue('Joel');
    await expect(profile.name).toHaveAttribute('maxlength', '40');
    await expect(profile.hint).toHaveText('First name is plenty.');
    await expect(profile.addAPhoto).toBeVisible();
    await expect(profile.initial).toHaveText('J');
    await expect(profile.photoCaption).toHaveText('A photo is optional');
    await expect(profile.back).toHaveAttribute('href', `/i/${inviteCode}`);
  });

  // L2-013 AC2
  test('a chosen photo replaces the initial', async ({ page, pk }) => {
    await pk.open('yourProfile');
    const profile = new YourProfilePage(page);

    await profile.choosePhoto(portrait);

    await expect(profile.changeYourPhoto).toBeVisible();
    await expect(profile.photoPreview).toBeVisible();
    await expect(profile.photoCaption).toHaveText('Looking good.');
    await expect(profile.photoError).toHaveCount(0);
  });

  // L2-013 AC2
  test('a file that is not a photo is refused with a message', async ({ page, pk }) => {
    await pk.open('yourProfile');
    const profile = new YourProfilePage(page);

    await profile.choosePhoto({
      name: 'notes.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.7'),
    });

    await expect(profile.photoError).toHaveText(
      'That file isn’t a photo we can use. Choose a JPEG, PNG, WebP or HEIC.',
    );
    await expect(profile.addAPhoto).toBeVisible();
    await expect(profile.photoPreview).toHaveCount(0);
  });

  // L2-013 AC2
  test('a photo over 10 MB is refused, and the photo already chosen stays', async ({
    page,
    pk,
  }) => {
    await pk.open('yourProfile');
    const profile = new YourProfilePage(page);
    await profile.choosePhoto(portrait);

    await profile.choosePhoto({
      name: 'huge.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
    });

    await expect(profile.photoError).toHaveText('That photo is over 10 MB. Choose a smaller one.');
    await expect(profile.changeYourPhoto).toBeVisible();
    await expect(profile.photoPreview).toBeVisible();
  });

  // L2-013 AC3
  test('I’m in is disabled while the name is empty, and the field says why', async ({
    page,
    pk,
  }) => {
    await pk.open('yourProfile');
    const profile = new YourProfilePage(page);

    await profile.name.fill('   ');

    await expect(profile.imIn).toBeDisabled();
    await expect(profile.nameError).toHaveText('Enter a name so people know who you are.');
    await expect(profile.name).toHaveAttribute('aria-invalid', 'true');
    await expect(profile.initial).toHaveText('?');

    await profile.name.fill('Jo');

    await expect(profile.imIn).toBeEnabled();
    await expect(profile.nameError).toHaveCount(0);
    await expect(profile.initial).toHaveText('J');
  });

  // L2-013 AC4
  test('I’m in reads "Joining…" until you are a member, then the welcome opens', async ({
    page,
    pk,
  }) => {
    const release = await hold(page, joinKey);
    await pk.open('yourProfile');
    const profile = new YourProfilePage(page);
    await profile.choosePhoto(portrait);
    const sent = page.waitForRequest((request) => request.url().endsWith('/join'));

    await profile.imIn.click();

    await expect(profile.joining).toBeDisabled();
    await expect(profile.joining).toHaveAttribute('aria-busy', 'true');
    await expect(profile.name).toHaveAttribute('readonly', '');
    const body = (await sent).postDataBuffer()?.toString('latin1') ?? '';
    expect(body).toContain('name="displayName"\r\n\r\nJoel');
    expect(body).toContain('name="photo"; filename="call3.jpg"');

    release();

    await expect(page).toHaveURL(`/i/${inviteCode}/welcome`);
  });

  test('Enter in the name joins too', async ({ page, pk }) => {
    await pk.open('yourProfile');
    const profile = new YourProfilePage(page);

    await profile.name.press('Enter');

    await expect(page).toHaveURL(`/i/${inviteCode}/welcome`);
  });

  // L2-013 AC5
  test('when joining fails the name and photo stay, a message says so and I’m in works again', async ({
    page,
    pk,
  }) => {
    await answerOnce(page, joinKey, problem(500, 'server_error'));
    await pk.open('yourProfile');
    const profile = new YourProfilePage(page);
    await profile.name.fill('Joel B');
    await profile.choosePhoto(portrait);

    await profile.imIn.click();

    await expect(profile.alert).toContainText('We couldn’t add you just yet.');
    await expect(profile.alert).toContainText(
      'Your name and photo are still here. Give it another go.',
    );
    await expect(profile.name).toHaveValue('Joel B');
    await expect(profile.photoPreview).toBeVisible();
    await expect(profile.imIn).toBeEnabled();

    await profile.imIn.click();

    await expect(page).toHaveURL(`/i/${inviteCode}/welcome`);
  });

  // L2-013 AC2: the API has the last word on what a photo is
  test('a photo the API refuses is said at the photo, and nothing else is lost', async ({
    page,
    pk,
  }) => {
    await answer(page, joinKey, problem(400, 'photo_type_not_allowed', { field: 'photo' }));
    await pk.open('yourProfile');
    const profile = new YourProfilePage(page);
    await profile.choosePhoto(portrait);

    await profile.imIn.click();

    await expect(profile.photoError).toHaveText(
      'That file isn’t a photo we can use. Choose a JPEG, PNG, WebP or HEIC.',
    );
    await expect(profile.name).toHaveValue('Joel');
    await expect(profile.imIn).toBeEnabled();
    await expect(profile.alert).toHaveCount(0);
  });

  // L2-016 AC1
  test('a Popkin that wrapped up while you were here sends you back to its invite', async ({
    page,
    pk,
  }) => {
    await answer(page, joinKey, problem(409, 'popkin_wrapped_up'));
    await pk.open('yourProfile');
    const profile = new YourProfilePage(page);

    await profile.imIn.click();

    await expect(page).toHaveURL(`/i/${inviteCode}`);
  });

  test('opened for a wrapped-up Popkin, it goes back to the invite', async ({ page, pk }) => {
    await wrappedUpInvite(page);
    await pk.open('yourProfile');

    await expect(page).toHaveURL(`/i/${inviteCode}`);
  });

  // L2-012 AC4
  test('opened by a member, it goes to the Popkin', async ({ page, pk }) => {
    await asMemberOfLakeside(page);
    await pk.open('yourProfile');

    await expect(page).toHaveURL(`/p/${created.id}`);
  });
});

// L2-007 AC2
test('the profile step needs a session', async ({ page, pk }) => {
  await asVisitor(page);
  await pk.open('yourProfile');

  await expect(page).toHaveURL(
    `/sign-in?returnUrl=${encodeURIComponent(`/i/${inviteCode}/profile`)}`,
  );
});

test.describe('the profile step on a wider screen', () => {
  test.beforeEach(async ({ page }) => {
    await asJoel(page);
  });

  // L2-058 AC10
  test('from 768 px it shows who is already in', async ({ page, pk }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await pk.open('yourProfile');
    const profile = new YourProfilePage(page);

    await expect(profile.picture).toContainText('Already in Lakeside Weekend');
    await expect(profile.names).toHaveText(['Mara Okafor', 'Walt Brennan', 'Dev Patel']);
    await expect(profile.avatars).toHaveText(['MO', 'WB', 'DP']);
    await expect(profile.more).toHaveCount(0);
    await expect(profile.imIn).toBeVisible();
  });

  test('eight people are named and the rest counted', async ({ page, pk }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await lakesideCast(page);
    await pk.open('yourProfile');
    const profile = new YourProfilePage(page);

    await expect(profile.people).toHaveCount(8);
    await expect(profile.more).toHaveText('and 6 more');
  });

  test('joining still works when the people already in cannot be loaded', async ({ page, pk }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await answer(page, membersKey, problem(500, 'server_error'));
    await pk.open('yourProfile');
    const profile = new YourProfilePage(page);

    await expect(profile.picture).toContainText('Already in Lakeside Weekend');
    await expect(profile.people).toHaveCount(0);

    await profile.imIn.click();

    await expect(page).toHaveURL(`/i/${inviteCode}/welcome`);
  });

  // L2-058 AC2, AC13
  test('on a phone it is one column with no picture', async ({ page, pk }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await pk.open('yourProfile');
    const profile = new YourProfilePage(page);

    await expect(profile.heading).toBeVisible();
    await expect(profile.picture).toHaveCount(0);
    await expect(profile.imIn).toBeInViewport();
  });
});
