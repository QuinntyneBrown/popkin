import { expect, test } from '../fixtures/pk-test';
import { answer } from '../fixtures/stubs';
import { NameYourPopkinPage } from '../pages/name-your-popkin.page';

test.describe('starting a Popkin needs a session', () => {
  // L2-007 AC2, AC3
  test('a visitor is sent to sign in, with the screen they asked for to come back to', async ({
    page,
  }) => {
    await answer(page, 'GET /api/auth/session', { status: 401 });

    await page.goto('/new');

    await expect(page).toHaveURL(/\/sign-in\?returnUrl=%2Fnew$/);
  });
});

test.describe('naming a Popkin', () => {
  // L2-008 AC1, AC6
  test('opens with a name field, twelve emoji, seven colours and a preview, the first emoji and Coral chosen', async ({
    page,
    pk,
  }) => {
    await pk.open('nameYourPopkin');

    const step = new NameYourPopkinPage(page);
    await expect(step.root).toBeVisible();
    await expect(step.heading).toHaveText('Name your Popkin');
    await expect(step.name).toHaveValue('');
    await expect(step.name).toHaveAttribute('placeholder', 'Thursday Night Crew');
    await expect(step.emoji).toHaveCount(12);
    await expect(step.colours).toHaveText(['', '', '', '', '', '', '']);
    await expect(step.colours.first()).toHaveAccessibleName('Coral');
    for (const [i, name] of ['Coral', 'Teal', 'Sky', 'Berry', 'Leaf', 'Plum', 'Amber'].entries()) {
      await expect(step.colours.nth(i)).toHaveAccessibleName(name);
    }
    await expect(step.emoji.first()).toHaveAttribute('aria-pressed', 'true');
    await expect(step.colour('Coral')).toHaveAttribute('aria-pressed', 'true');
    await expect(step.preview).toHaveText('🏕️');
    await expect(step.looksGood).toBeVisible();
  });

  // L2-008 AC2
  test('a pick moves the preview and the button at once and is marked as pressed', async ({
    page,
    pk,
  }) => {
    await pk.open('nameYourPopkin');
    const step = new NameYourPopkinPage(page);

    await step.emojiNamed('Guitar').click();
    await step.colour('Teal').click();

    await expect(step.preview).toHaveText('🎸');
    await expect(step.emojiNamed('Guitar')).toHaveAttribute('aria-pressed', 'true');
    await expect(step.emojiNamed('Camping')).toHaveAttribute('aria-pressed', 'false');
    await expect(step.colour('Teal')).toHaveAttribute('aria-pressed', 'true');
    await expect(step.colour('Coral')).toHaveAttribute('aria-pressed', 'false');
    await expect(step.screen).toHaveAttribute('data-accent', 'teal');
  });

  // L2-008 AC3
  test('Looks good is disabled while the name is empty or only spaces', async ({ page, pk }) => {
    await pk.open('nameYourPopkin');
    const step = new NameYourPopkinPage(page);

    await expect(step.looksGood).toBeDisabled();
    await step.name.fill('   ');
    await expect(step.looksGood).toBeDisabled();
    await step.name.fill('Lakeside Weekend');
    await expect(step.looksGood).toBeEnabled();
  });

  // L2-008 AC4
  test('no more than 40 characters are accepted, and a count shows 40 of 40', async ({
    page,
    pk,
  }) => {
    await pk.open('nameYourPopkin');
    const step = new NameYourPopkinPage(page);

    await step.name.pressSequentially('The Brennan–Okafor Lakeside Reunion 2026 and more');

    await expect(step.name).toHaveValue('The Brennan–Okafor Lakeside Reunion 2026');
    await expect(step.count).toHaveText('40 of 40');
    await expect(step.name).toHaveAccessibleDescription('40 of 40');
  });

  // L2-008 AC5
  test('Looks good opens How long, and going back keeps the name, emoji and colour', async ({
    page,
    pk,
  }) => {
    await pk.open('nameYourPopkin');
    const step = new NameYourPopkinPage(page);
    await step.chooseLakeside();

    await step.looksGood.click();
    await expect(page).toHaveURL(/\/new\/length$/);
    await page.getByRole('link', { name: 'Back' }).click();

    await expect(step.name).toHaveValue('Lakeside Weekend');
    await expect(step.emojiNamed('Camping')).toHaveAttribute('aria-pressed', 'true');
    await expect(step.colour('Teal')).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('naming a Popkin on a wider screen', () => {
  // L2-058 AC10
  test('from 768 px a card beside the form shows how the Popkin will look to everyone', async ({
    page,
    pk,
  }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await pk.open('nameYourPopkin');
    const step = new NameYourPopkinPage(page);

    await expect(step.picture).toBeVisible();
    await expect(step.picture).toContainText('How it’ll look to everyone');
    await expect(step.previewName).toHaveText('Your Popkin');
    await expect(step.previewTile).toHaveText('🏕️');
    await expect(step.previewAvatar).toHaveText('MO');
    await expect(step.previewHost).toContainText('Just you, for now');
    await expect(step.previewTimeLeft).toHaveText('Just started');
  });

  // L2-008 AC2, L2-058 AC10
  test('the card follows the name, the emoji and the colour as they change', async ({
    page,
    pk,
  }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await pk.open('nameYourPopkin');
    const step = new NameYourPopkinPage(page);

    await step.name.fill('Lakeside Weekend');
    await step.emojiNamed('Guitar').click();
    await step.colour('Teal').click();

    await expect(step.previewName).toHaveText('Lakeside Weekend');
    await expect(step.previewTile).toHaveText('🎸');
    await expect(step.screen).toHaveAttribute('data-accent', 'teal');
    await expect(step.looksGood).toBeVisible();
  });

  // L2-058 AC2, AC13
  test('on a phone the card is not there to reach, and the row above the form previews the Popkin', async ({
    page,
    pk,
  }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await pk.open('nameYourPopkin');
    const step = new NameYourPopkinPage(page);

    await expect(step.preview).toHaveText('🏕️');
    await expect(step.picture).toHaveCount(0);
  });
});

test.describe('naming a Popkin on a phone with its keyboard open', () => {
  // A phone of 390 px whose keyboard leaves 420 px of the screen showing.
  test.use({ viewport: { width: 390, height: 420 }, hasTouch: true, isMobile: true });

  // L2-058 AC14
  test('while the name takes typing, Looks good sits under the form, not on it', async ({
    page,
    pk,
  }) => {
    await pk.open('nameYourPopkin');
    const step = new NameYourPopkinPage(page);

    await step.name.focus();

    await expect(step.looksGood).not.toBeInViewport();

    await step.name.blur();

    await expect(step.looksGood).toBeInViewport();
  });
});
