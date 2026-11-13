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
