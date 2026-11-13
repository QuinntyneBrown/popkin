import {
  canoeId,
  experiencesOf,
  experiencesUrl,
  theMockExperienceScreens,
} from '../fixtures/experiences';
import { expect, test } from '../fixtures/pk-test';
import { ExperiencesPage } from '../pages/experiences.page';
import { NotFoundPage } from '../pages/not-found.page';

test.describe('Experiences', () => {
  // L2-037 AC1
  test('says what it is and lists the experiences as cards, the newest first', async ({ page }) => {
    await theMockExperienceScreens(page);
    await page.goto(experiencesUrl);
    const experiences = new ExperiencesPage(page);

    await expect(experiences.root).toBeVisible();
    await expect(experiences.heading).toHaveText('Experiences');
    await expect(experiences.intro).toBeVisible();
    await expect(experiences.titles).toHaveText([
      'Sunrise canoe to Heron Point',
      'La Paloma Taqueria',
      'Ridge trail loop',
      'Beach day next summer?',
    ]);
    await expect(experiences.kindOf('Sunrise canoe')).toHaveText('Something we did');
    await expect(experiences.kindOf('La Paloma')).toHaveText('Restaurant');
    await expect(experiences.kindOf('Beach day')).toHaveText('Want to do');
    await expect(experiences.byOf('Sunrise canoe')).toHaveText(/Mara · Sat morning/);
    await expect(experiences.byOf('Beach day')).toHaveText(/Ellie · Idea/);
    await expect(experiences.currentTab).toHaveText(/Experiences/);
    await expect(experiences.screen).toHaveAttribute('data-accent', 'teal');
  });

  // L2-037 AC2, AC3
  test('shows the average with the number of ratings, or how many are keen', async ({ page }) => {
    await theMockExperienceScreens(page);
    await page.goto(experiencesUrl);
    const experiences = new ExperiencesPage(page);

    await expect(experiences.ratingOf('Sunrise canoe')).toHaveText(/4\.7\s*\(11\)/);
    await expect(experiences.ratingOf('La Paloma')).toHaveText(/4\.6\s*\(9\)/);
    await expect(experiences.footOf('Beach day')).toContainText('7 keen');
    await expect(experiences.ratingOf('Beach day')).toHaveCount(0);
  });

  // L2-040 AC5
  test('shows the Popkin’s emoji in the place of a picture that was not given', async ({
    page,
  }) => {
    await theMockExperienceScreens(page, (all) => (all.find(canoeId).picture = null));
    await page.goto(experiencesUrl);
    const experiences = new ExperiencesPage(page);

    await expect(experiences.mediaOf('Sunrise canoe')).toHaveText(/🏕️/);
    await expect(experiences.mediaOf('Ridge trail').locator('img')).toBeVisible();
  });

  // L2-037 AC4
  test('shows only what the group did, restaurants included, under "We did"', async ({ page }) => {
    await theMockExperienceScreens(page);
    await page.goto(experiencesUrl);
    const experiences = new ExperiencesPage(page);
    await expect(experiences.all).toHaveAttribute('aria-pressed', 'true');

    await experiences.weDid.click();

    await expect(experiences.titles).toHaveText([
      'Sunrise canoe to Heron Point',
      'La Paloma Taqueria',
      'Ridge trail loop',
    ]);
    await expect(experiences.weDid).toHaveAttribute('aria-pressed', 'true');
    await expect(experiences.all).toHaveAttribute('aria-pressed', 'false');
    expect(experiencesOf(page).asked).toEqual(['all', 'did']);
  });

  // L2-037 AC4
  test('keeps the filter when the screen is opened again by its address', async ({ page }) => {
    await theMockExperienceScreens(page);
    await page.goto(experiencesUrl);
    const experiences = new ExperiencesPage(page);
    await experiences.wantToDo.click();
    await expect(experiences.titles).toHaveText(['Beach day next summer?']);

    await page.reload();

    await expect(experiences.wantToDo).toHaveAttribute('aria-pressed', 'true');
    await expect(experiences.titles).toHaveText(['Beach day next summer?']);
  });

  // L2-037 AC5
  test('says a filter has nothing in it, and offers to share one or show all', async ({ page }) => {
    await theMockExperienceScreens(page, (all) => {
      all.shared = all.shared.filter((s) => s.kind !== 'Want');
    });
    await page.goto(experiencesUrl);
    const experiences = new ExperiencesPage(page);

    await experiences.wantToDo.click();

    await expect(experiences.emptyHeading).toHaveText('Nothing on the wish list');
    await expect(experiences.shareFirst).toBeVisible();
    await experiences.showAll.click();
    await expect(experiences.titles).toHaveCount(3);
    await expect(experiences.all).toHaveAttribute('aria-pressed', 'true');
  });

  // L2-037 AC6
  test('explains experiences when the Popkin has none, without filters', async ({ page }) => {
    await theMockExperienceScreens(page, (all) => all.empty());
    await page.goto(experiencesUrl);
    const experiences = new ExperiencesPage(page);

    await expect(experiences.emptyHeading).toHaveText('Nothing shared yet');
    await expect(experiences.empty).toContainText('Share one and everyone can rate it.');
    await expect(experiences.shareFirst).toBeVisible();
    await expect(experiences.filters).toHaveCount(0);
  });

  // L2-056 AC1
  test('says it is loading while the experiences are on their way', async ({ page }) => {
    let release = () => {};
    await theMockExperienceScreens(page, (all) => (release = all.hold('list')));
    await page.goto(experiencesUrl);
    const experiences = new ExperiencesPage(page);

    await expect(experiences.loading).toHaveText('Loading experiences…');
    await expect(experiences.skeletons.first()).toBeVisible();
    release();
    await expect(experiences.titles).toHaveCount(4);
  });

  // L2-056 AC2
  test('says the experiences did not load, and loads them on "Try again"', async ({ page }) => {
    await theMockExperienceScreens(page, (all) => all.fail('list'));
    await page.goto(experiencesUrl);
    const experiences = new ExperiencesPage(page);

    await expect(experiences.error).toContainText('We couldn’t load the experiences');
    experiencesOf(page).recover('list');
    await experiences.tryAgain.click();

    await expect(experiences.titles).toHaveCount(4);
  });

  // L2-051 AC1
  test('is not found for someone who is not a member', async ({ page }) => {
    await theMockExperienceScreens(page, (all) => (all.notAMember = true));
    await page.goto(experiencesUrl);

    await expect(new NotFoundPage(page).root).toBeVisible();
  });

  // L2-058 AC7, AC9
  for (const [width, across, where] of [
    [360, 1, 'floating'],
    [640, 2, 'floating'],
    [768, 2, 'header'],
    [1024, 3, 'header'],
    [1280, 4, 'header'],
  ] as const) {
    test(`is ${across} across at ${width} px, with "Share one" ${where}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await theMockExperienceScreens(page);
      await page.goto(experiencesUrl);
      const experiences = new ExperiencesPage(page);
      await expect(experiences.titles).toHaveCount(4);

      expect(await experiences.across()).toBe(across);
      await expect(experiences.shareFloating).toBeVisible({ visible: where === 'floating' });
      await expect(experiences.shareInHeader).toBeVisible({ visible: where === 'header' });
    });
  }
});
