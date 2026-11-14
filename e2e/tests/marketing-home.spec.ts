import { expect, test } from '../fixtures/pk-test';
import { MarketingHomePage } from '../pages/marketing-home.page';

// Traces to: L2-079
test.describe('The marketing home page', () => {
  // AC1
  test('shows the navigation, the hero, the film and the landing page’s sections, in order', async ({
    page,
    pk,
  }) => {
    await pk.open('marketingHome');
    const site = new MarketingHomePage(page);

    await expect(site.root).toBeVisible();
    await expect(site.logo).toBeVisible();
    await expect(site.navStart).toHaveText('Start a Popkin');
    await expect(site.heroHeading).toHaveText('Your people, popped up in seconds.');
    await expect(site.sectionHeadings).toHaveText([
      'See Popkin in action.',
      'Scan. Join. You’re in.',
      'For every group that forms around a table.',
      'Better than a group chat.',
      'Free. Like, actually free.',
    ]);
    await expect(site.footer).toBeVisible();
  });

  // AC2
  test('opens on the landing page’s hero, with "Watch the film" beside "Start a Popkin"', async ({
    page,
    pk,
  }) => {
    await pk.open('marketingHome');
    const site = new MarketingHomePage(page);

    await expect(site.heroLead).toHaveText(
      'Popkin is a free little home for any small group: chat, photos, plans and video, joined with one scan. Keep it for a weekend or for years.',
    );
    await expect(site.heroStart).toHaveText('Start a Popkin');
    await expect(site.heroFilm).toHaveText('Watch the film');
    await expect(site.heroFree).toHaveText('Free. Takes about a minute.');
    await expect(site.preview).toContainText('Lakeside Weekend');
    await expect(site.preview).toContainText('14 here');
    await expect(site.preview).toContainText('Wraps up Sunday');
    await expect(site.previewQr).toBeVisible();
  });

  // AC3
  test('says what the landing page says after the film, in the same words', async ({
    page,
    pk,
  }) => {
    await pk.open('marketingHome');
    const site = new MarketingHomePage(page);

    await expect(site.stepHeadings).toHaveText([
      'Pop one up',
      'Share the QR code',
      'You’re together',
    ]);
    await expect(site.ideaNames).toHaveText(['Small group', 'Hackathon', 'Team', 'Family trip']);
    await expect(site.compareRowHeadings).toHaveText([
      'Joining',
      'Photos',
      'Plans',
      'Video',
      'The end',
    ]);
    await expect(site.free).toContainText('No ads, no premium tier');
  });

  // AC4
  test('ends with the footer: the line, seven links and the legal line', async ({ page, pk }) => {
    await pk.open('marketingHome');
    const site = new MarketingHomePage(page);

    await expect(site.footerBlurb).toHaveText(
      'Pop-up communities for small groups. Made with care, for people not metrics.',
    );
    await expect(site.footerLinks).toHaveText([
      'How it works',
      'Ideas',
      'Watch the film',
      'Sign in',
      'Safety',
      'Privacy',
      'Help',
    ]);
    await expect(site.footerLegal).toBeVisible();
  });

  // AC5
  test('is one column on a phone and does not scroll sideways', async ({ page, pk }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await pk.open('marketingHome');
    const site = new MarketingHomePage(page);

    await expect(site.film).toBeVisible();
    expect(await site.heroSideBySide()).toBe(false);
    expect(await site.ideasAcross()).toBe(1);
    expect(await site.scrollsSideways()).toBe(false);
  });

  // AC5
  test('puts the hero’s text beside the preview and four ideas across from 1024 px', async ({
    page,
    pk,
  }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await pk.open('marketingHome');
    const site = new MarketingHomePage(page);

    await expect(site.heroHeading).toBeVisible();
    expect(await site.heroSideBySide()).toBe(true);
    expect(await site.ideasAcross()).toBe(4);
  });

  // AC6
  test('keeps the logo and "Start a Popkin" in the navigation on a phone, "Sign in" in the footer', async ({
    page,
    pk,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await pk.open('marketingHome');
    const site = new MarketingHomePage(page);

    await expect(site.logo).toBeVisible();
    await expect(site.navStart).toBeVisible();
    await expect(site.navSignIn).toBeHidden();
    await expect(site.footerLink('Sign in')).toBeVisible();
  });
});

// Traces to: L2-080
test.describe('The pitch film', () => {
  /** Requests for the film's file, which nothing makes before play (AC1). */
  let filmRequests: string[];

  test.beforeEach(async ({ page }) => {
    filmRequests = [];
    // The film is not needed to prove the player: its address is answered with nothing.
    await page.route('**/media/meet-popkin.mp4', async (route) => {
      filmRequests.push(route.request().url());
      await route.fulfill({ status: 404 });
    });
  });

  // AC1
  test('shows a still, a play button and the length, and fetches nothing before play', async ({
    page,
    pk,
  }) => {
    await pk.open('marketingHome');
    const site = new MarketingHomePage(page);

    await expect(site.filmPlay).toBeVisible();
    await expect(site.filmLength).toHaveText('1:38');
    await expect(site.filmVideo).not.toHaveAttribute('controls');
    await expect(site.filmVideo).toHaveAttribute('preload', 'none');
    await expect(site.filmChapters).toHaveText([
      '0:00Getting everyone together',
      '0:16Meet Popkin',
      '1:08A proper send-off',
    ]);
    expect(filmRequests).toEqual([]);
  });

  // AC2
  test('gives way to the film, with the browser’s controls, from the start', async ({
    page,
    pk,
  }) => {
    await pk.open('marketingHome');
    const site = new MarketingHomePage(page);

    await site.filmPlay.click();

    await expect(site.filmPlay).toBeHidden();
    await expect(site.filmVideo).toHaveAttribute('controls');
    await expect(site.filmVideo).toHaveAccessibleName('Meet Popkin');
    expect(await site.filmTime()).toBe(0);
  });

  // AC3
  test('plays from a chapter and marks it as the current one', async ({ page, pk }) => {
    await pk.open('marketingHome');
    const site = new MarketingHomePage(page);

    await site.chapter('A proper send-off').click();

    await expect(site.chapter('A proper send-off')).toHaveAttribute('aria-current', 'true');
    await expect(site.chapter('Meet Popkin')).not.toHaveAttribute('aria-current');
    await expect(site.filmVideo).toHaveAttribute('controls');
    expect(await site.filmTime()).toBe(68);
  });

  // AC4
  test('"Watch the film" moves the page to the film and focuses its heading', async ({
    page,
    pk,
  }) => {
    await pk.open('marketingHome');
    const site = new MarketingHomePage(page);

    await site.heroFilm.click();

    await expect(site.filmHeading).toBeFocused();
    await expect(site.filmHeading).toBeInViewport();
    await expect(page).toHaveURL(/#film$/);
  });

  // AC6
  test('answers the keyboard: Enter plays and focuses the film, Space plays a chapter', async ({
    page,
    pk,
  }) => {
    await pk.open('marketingHome');
    const site = new MarketingHomePage(page);

    await site.filmPlay.focus();
    await page.keyboard.press('Enter');
    await expect(site.filmVideo).toBeFocused();

    await site.chapter('Meet Popkin').focus();
    await page.keyboard.press('Space');
    await expect(site.chapter('Meet Popkin')).toHaveAttribute('aria-current', 'true');
    expect(await site.filmTime()).toBe(16);
  });
});
