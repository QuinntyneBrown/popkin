import { asVisitor } from '../fixtures/journeys';
import { maraWithPopkins } from '../fixtures/my-popkins';
import { expect, test } from '../fixtures/pk-test';
import { LandingPage } from '../pages/landing.page';
import { MyPopkinsPage } from '../pages/my-popkins.page';

// L2-001
test.describe('The landing page', () => {
  test.beforeEach(async ({ page }) => {
    await asVisitor(page);
  });

  // AC1
  test('opens on the hero: what Popkin is, "Start a Popkin" and a preview', async ({
    page,
    pk,
  }) => {
    await pk.open('landing');
    const landing = new LandingPage(page);

    await expect(landing.root).toBeVisible();
    await expect(landing.heroHeading).toHaveText('Your people, popped up in seconds.');
    await expect(landing.heroLead).toHaveText(
      'Popkin is a little home for any small group: chat, photos, plans and video, joined with one scan. Keep it for a weekend or for years.',
    );
    await expect(landing.heroStart).toHaveText('Start a Popkin');
    await expect(landing.heroNote).toHaveText('Takes about a minute.');
    await expect(landing.preview).toContainText('Lakeside Weekend');
    await expect(landing.preview).toContainText('14 here');
    await expect(landing.preview).toContainText('Wraps up Sunday');
    await expect(landing.previewQr).toBeVisible();
  });

  // AC2
  test('says how it works in three numbered steps', async ({ page, pk }) => {
    await pk.open('landing');
    const landing = new LandingPage(page);

    await expect(landing.howHeading).toHaveText('Scan. Join. You’re in.');
    await expect(landing.stepHeadings).toHaveText([
      'Pop one up',
      'Share the QR code',
      'You’re together',
    ]);
    await expect(landing.steps.nth(0)).toContainText('1');
    await expect(landing.steps.nth(2)).toContainText('3');
  });

  // AC3
  test('gives four ideas, each with its emoji, a sentence and its length', async ({ page, pk }) => {
    await pk.open('landing');
    const landing = new LandingPage(page);

    await expect(landing.ideaNames).toHaveText(['Small group', 'Hackathon', 'Team', 'Family trip']);
    await expect(landing.ideaLengths).toHaveText([
      'Keeps going',
      'One weekend',
      'One season',
      'Ten days',
    ]);
    await expect(landing.ideaCards.nth(0)).toContainText('🕯️');
    await expect(landing.ideaCards.nth(0)).toContainText('The Thursday-night crew.');
    await expect(landing.ideaCards.nth(3)).toContainText('🏖️');
  });

  // AC4
  test('compares a group chat with a Popkin in five rows, each column with its heading', async ({
    page,
    pk,
  }) => {
    await pk.open('landing');
    const landing = new LandingPage(page);

    await expect(landing.compareHeading).toHaveText('Better than a group chat.');
    await expect(landing.compareCaption).toHaveText('A group chat compared with a Popkin');
    await expect(landing.compareColumns).toHaveText(['What', 'Group chat', 'Popkin']);
    await expect(landing.compareRowHeadings).toHaveText([
      'Joining',
      'Photos',
      'Plans',
      'Video',
      'The end',
    ]);
    await expect(landing.compareRows.nth(0)).toContainText('Someone adds numbers one by one');
    await expect(landing.compareRows.nth(0)).toContainText('Scan a QR code, you’re in');
  });

  // L2-061 AC3
  test('says Popkin has no ads, and never that it is free', async ({ page, pk }) => {
    await pk.open('landing');
    const landing = new LandingPage(page);

    await expect(landing.noAdsHeading).toHaveText('No ads. Like, actually none.');
    await expect(landing.noAds).toContainText('No ads, no tracking');
    await expect(landing.mentionsOfFree).toHaveCount(0);
  });

  // L2-061 AC2
  test('loads nothing from anywhere but Popkin', async ({ page, pk, baseURL }) => {
    const popkin = new URL(baseURL ?? '').host;
    const elsewhere: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.protocol.startsWith('http') && url.host !== popkin) elsewhere.push(request.url());
    });

    await pk.open('landing');
    await expect(new LandingPage(page).noAdsHeading).toBeVisible();

    expect(elsewhere).toEqual([]);
  });

  // AC5
  test('is one column on a phone and does not scroll sideways', async ({ page, pk }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await pk.open('landing');
    const landing = new LandingPage(page);

    await expect(landing.heroHeading).toBeVisible();
    expect(await landing.heroSideBySide()).toBe(false);
    expect(await landing.ideasAcross()).toBe(1);
    expect(await landing.scrollsSideways()).toBe(false);
  });

  // AC6
  test('puts the hero’s text beside the preview and four ideas across from 1024 px', async ({
    page,
    pk,
  }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await pk.open('landing');
    const landing = new LandingPage(page);

    await expect(landing.heroHeading).toBeVisible();
    expect(await landing.heroSideBySide()).toBe(true);
    expect(await landing.ideasAcross()).toBe(4);
  });
});

// L2-002
test.describe('The actions of the landing page', () => {
  test.beforeEach(async ({ page }) => {
    await asVisitor(page);
  });

  // AC1
  for (const place of ['navStart', 'heroStart', 'noAdsStart'] as const) {
    test(`"Start a Popkin" opens the sign-up screen (${place})`, async ({ page, pk }) => {
      await pk.open('landing');

      await new LandingPage(page)[place].click();

      await expect(page).toHaveURL('/sign-up');
    });
  }

  // AC2
  test('"Sign in" opens the sign-in screen', async ({ page, pk }) => {
    await pk.open('landing');

    await new LandingPage(page).navSignIn.click();

    await expect(page).toHaveURL('/sign-in');
  });

  // AC4
  test('on a phone, the navigation keeps "Start a Popkin" and "Sign in" is in the footer', async ({
    page,
    pk,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await pk.open('landing');
    const landing = new LandingPage(page);

    await expect(landing.navStart).toBeVisible();
    await expect(landing.navSignIn).toBeHidden();
    await landing.footerSignIn.click();

    await expect(page).toHaveURL('/sign-in');
  });

  // AC5
  test('"How it works" scrolls to its section and moves focus to its heading', async ({
    page,
    pk,
  }) => {
    await pk.open('landing');
    const landing = new LandingPage(page);

    await landing.navHowItWorks.click();

    await expect(landing.howHeading).toBeFocused();
    await expect(landing.howHeading).toBeInViewport();
  });

  test('"Ideas" scrolls to its section and moves focus to its heading', async ({ page, pk }) => {
    await pk.open('landing');
    const landing = new LandingPage(page);

    await landing.navIdeas.click();

    await expect(landing.ideasHeading).toBeFocused();
    await expect(landing.ideasHeading).toBeInViewport();
  });

  test('works from the keyboard: the link to a section is followed with Enter', async ({
    page,
    pk,
  }) => {
    await pk.open('landing');
    const landing = new LandingPage(page);

    await landing.navIdeas.focus();
    await page.keyboard.press('Enter');

    await expect(landing.ideasHeading).toBeFocused();
  });
});

// L2-002 AC3
test.describe('The landing page address', () => {
  test('opens My Popkins for a person who is signed in', async ({ page }) => {
    await maraWithPopkins(page);

    await page.goto('/');

    await expect(page).toHaveURL('/popkins');
    await expect(new MyPopkinsPage(page).root).toBeVisible();
  });
});
