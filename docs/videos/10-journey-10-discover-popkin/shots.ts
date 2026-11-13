import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { asVisitor } from '../../../e2e/fixtures/journeys';
import { theMockPopkins } from '../../../e2e/fixtures/my-popkins';
import { type Pk, test } from '../../../e2e/fixtures/pk-test';
import { LandingPage } from '../../../e2e/pages/landing.page';
import { MyPopkinsPage } from '../../../e2e/pages/my-popkins.page';
import { SignInPage } from '../../../e2e/pages/sign-in.page';
import { SignUpPage } from '../../../e2e/pages/sign-up.page';
import { WelcomePage } from '../../../e2e/pages/welcome.page';
import { bringToTop, detail, frame, shot, type Size, type Theme } from '../../../tools/video-record/shots';

/**
 * The screenshots of video 10: journey 10, Discover Popkin, in the running app. The landing page
 * and the welcome screen are opened by their keys in `e2e/fixtures/routes.ts`, as a visitor
 * (`asVisitor`): the recorded session is signed in, and a signed-in person who opens `/` gets
 * My Popkins, which the last shot shows. Every /api request is answered in memory by the
 * fixtures of `e2e/` or the recording (ADR 0005); no backend and no database ran. Not a test and
 * not a sweep: only `node tools/video-record/record.mjs docs/videos/10-journey-10-discover-popkin`
 * runs it.
 */

const closeUp = (region: Locator, name: string, pad = 12) => detail(region, name, pad);
const lower = (size: Size) => size.toLowerCase();
const SIZES = ['XS', 'M', 'L', 'XL'] as const satisfies readonly Size[];

/** Waits until every picture on the page has arrived. */
async function pictures(page: Page): Promise<void> {
  await page.evaluate(() =>
    Promise.all(
      [...document.images].map((image) => image.complete || image.decode().catch(() => undefined)),
    ),
  );
}

/** Opens the landing page as a visitor, at a size and a theme. */
async function landingAt(page: Page, pk: Pk, size: Size, theme: Theme = 'light'): Promise<LandingPage> {
  await frame(page, size, theme);
  await asVisitor(page);
  await pk.open('landing');
  const landing = new LandingPage(page);
  await expect(landing.heroHeading).toHaveText('Your people, popped up in seconds.');
  await expect(landing.previewName).toBeVisible();
  await pictures(page);
  return landing;
}

/** Opens the welcome screen as a visitor, at a size and a theme. */
async function welcomeAt(page: Page, pk: Pk, size: Size, theme: Theme = 'light'): Promise<WelcomePage> {
  await frame(page, size, theme);
  await asVisitor(page);
  await pk.open('welcome');
  const welcome = new WelcomePage(page);
  await expect(welcome.heading).toHaveText('Your people, popped up in seconds.');
  await expect(welcome.start).toBeVisible();
  await pictures(page);
  return welcome;
}

for (const size of SIZES) {
  test(`the landing page at ${size}: the hero, then the ideas`, async ({ page, pk }) => {
    const landing = await landingAt(page, pk, size);
    await shot(page, `landing-${lower(size)}`);
    await closeUp(landing.header, `nav-${lower(size)}`, 0);
    await bringToTop(landing.ideas, 0);
    await shot(page, `ideas-${lower(size)}`);
  });
}

test('the landing page in the dark', async ({ page, pk }) => {
  await landingAt(page, pk, 'XS', 'dark');
  await shot(page, 'landing-xs-dark');
});

test('the landing page on a phone, section by section', async ({ page, pk }) => {
  const landing = await landingAt(page, pk, 'XS');
  await closeUp(landing.heroText, 'hero-text', 8);
  await closeUp(landing.heroStart, 'hero-start', 10);
  await closeUp(landing.heroFree, 'hero-free', 10);
  await closeUp(landing.preview, 'preview', 0);

  await bringToTop(landing.how, 0);
  await shot(page, 'how-xs');
  await closeUp(landing.howHeading, 'how-heading', 10);
  for (const n of [0, 1, 2]) await closeUp(landing.steps.nth(n), `step-${n + 1}`, 6);

  await closeUp(landing.ideasHeading, 'ideas-heading', 10);
  for (const [n, name] of ['small-group', 'hackathon', 'team', 'family-trip'].entries()) {
    await closeUp(landing.ideaCards.nth(n), `idea-${name}`, 6);
  }

  await bringToTop(landing.comparison, 0);
  await shot(page, 'compare-xs');
  await closeUp(landing.compareHeading, 'compare-heading', 10);
  await closeUp(landing.compare, 'compare-table-xs', 6);

  await bringToTop(landing.free, 60);
  await shot(page, 'free-xs');
  await closeUp(landing.free, 'free-band-xs', 0);

  await landing.footer.scrollIntoViewIfNeeded();
  await shot(page, 'footer-xs');
  await closeUp(landing.footer, 'footer', 0);
  await closeUp(landing.footerSignIn, 'footer-sign-in', 10);
});

test('the landing page on a desktop: the links to its sections', async ({ page, pk }) => {
  const landing = await landingAt(page, pk, 'XL');
  await closeUp(landing.preview, 'preview-xl', 0);
  await closeUp(landing.navSignIn, 'nav-sign-in', 10);

  await landing.navHowItWorks.click();
  await expect(landing.howHeading).toBeFocused();
  await expect(landing.howHeading).toBeInViewport();
  await shot(page, 'how-xl');
  await closeUp(landing.stepList, 'steps-xl', 8);

  await landing.navIdeas.click();
  await expect(landing.ideasHeading).toBeFocused();
  await expect(landing.ideasHeading).toBeInViewport();
  await shot(page, 'ideas-jump-xl');
  await closeUp(landing.ideaGrid, 'idea-grid-xl', 8);

  await bringToTop(landing.comparison, 0);
  await shot(page, 'compare-xl');
  await closeUp(landing.compare, 'compare-table', 8);

  await closeUp(landing.free, 'free-band', 0);
  await landing.footer.scrollIntoViewIfNeeded();
  await shot(page, 'footer-xl');
  await closeUp(landing.footer, 'footer-xl-detail', 0);
});

test('"Start a Popkin" opens the sign-up screen', async ({ page, pk }) => {
  const landing = await landingAt(page, pk, 'XS');
  await landing.heroStart.click();
  await expect(page).toHaveURL('/sign-up');
  await expect(new SignUpPage(page).heading).toBeVisible();
  await pictures(page);
  await shot(page, 'sign-up-xs');
});

test('on a phone, "Sign in" in the footer opens the sign-in screen', async ({ page, pk }) => {
  const landing = await landingAt(page, pk, 'XS');
  await landing.footerSignIn.click();
  await expect(page).toHaveURL('/sign-in');
  await expect(new SignInPage(page).heading).toBeVisible();
  await pictures(page);
  await shot(page, 'sign-in-xs');
});

test('a signed-in person who opens the landing page gets My Popkins', async ({ page }) => {
  await frame(page, 'XS');
  await theMockPopkins(page);
  await page.goto('/');
  await expect(page).toHaveURL('/popkins');
  const myPopkins = new MyPopkinsPage(page);
  await expect(myPopkins.cards.first()).toBeVisible();
  await pictures(page);
  await shot(page, 'my-popkins-xs');
});

for (const size of SIZES) {
  test(`the welcome screen at ${size}`, async ({ page, pk }) => {
    const welcome = await welcomeAt(page, pk, size);
    await shot(page, `welcome-${lower(size)}`);
    if (size === 'XS') {
      await closeUp(welcome.heading, 'welcome-heading', 10);
      await closeUp(welcome.lead, 'welcome-lead', 10);
      await closeUp(welcome.start, 'welcome-start', 10);
      await closeUp(welcome.joinWithCode, 'welcome-join', 10);
      await closeUp(welcome.signIn, 'welcome-sign-in', 10);
      await closeUp(welcome.actions, 'welcome-actions', 10);
    }
    if (size === 'XL') await closeUp(welcome.actions, 'welcome-actions-xl', 12);
  });
}

test('the welcome screen in the dark', async ({ page, pk }) => {
  await welcomeAt(page, pk, 'XS', 'dark');
  await shot(page, 'welcome-xs-dark');
});
