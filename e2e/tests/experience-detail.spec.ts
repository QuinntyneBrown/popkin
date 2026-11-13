import { people } from '../fixtures/chat';
import {
  beachId,
  canoeId,
  experienceUrl,
  experiencesOf,
  experiencesUrl,
  ridgeId,
  theMockExperienceScreens,
} from '../fixtures/experiences';
import { expect, test } from '../fixtures/pk-test';
import { AddCommentDialog } from '../pages/add-comment.dialog';
import { ExperienceDetailPage } from '../pages/experience-detail.page';
import { ExperiencesPage } from '../pages/experiences.page';
import { NotFoundPage } from '../pages/not-found.page';
import { Toasts } from '../pages/toasts';

const canoe = experienceUrl(canoeId);

test.describe('An experience', () => {
  test('opens from its card, and goes back to Experiences', async ({ page }) => {
    await theMockExperienceScreens(page);
    await page.goto(experiencesUrl);

    await new ExperiencesPage(page).card('Sunrise canoe').click();

    const detail = new ExperienceDetailPage(page);
    await expect(page).toHaveURL(canoe);
    await expect(detail.root).toBeVisible();
    await detail.back.click();
    await expect(page).toHaveURL(experiencesUrl);
  });

  // L2-038 AC1
  test('shows its picture, kind and when, title, who shared it and its place', async ({ page }) => {
    await theMockExperienceScreens(page);
    await page.goto(canoe);
    const detail = new ExperienceDetailPage(page);

    await expect(detail.picture.locator('img')).toBeVisible();
    await expect(detail.kind).toHaveText('Something we did · Sat morning');
    await expect(detail.title).toHaveText('Sunrise canoe to Heron Point');
    await expect(detail.sharedBy).toHaveText(/Shared by Mara/);
    await expect(detail.place).toHaveText(/Heron Point, Lake Ossia/);
    await expect(detail.screen).toHaveAttribute('data-accent', 'teal');
  });

  // L2-038 AC1
  test('shows no place when none was given', async ({ page }) => {
    await theMockExperienceScreens(page);
    await page.goto(experienceUrl(ridgeId));
    const detail = new ExperienceDetailPage(page);

    await expect(detail.title).toHaveText('Ridge trail loop');
    await expect(detail.place).toHaveCount(0);
  });

  // L2-038 AC2, AC3
  test('shows the group’s score: the average, its stars, the count and a bar per star value', async ({
    page,
  }) => {
    await theMockExperienceScreens(page);
    await page.goto(canoe);
    const detail = new ExperienceDetailPage(page);

    await expect(detail.average).toHaveText('4.7');
    await expect(detail.stars).toHaveAccessibleName('4.7 out of 5');
    await expect(detail.count).toHaveText('11 ratings');
    await expect(detail.meters).toHaveCount(5);
    expect(await detail.barsInWords()).toEqual([
      '5 stars: 9 ratings',
      '4 stars: 1 rating',
      '3 stars: 1 rating',
      '2 stars: 0 ratings',
      '1 star: 0 ratings',
    ]);
  });

  // L2-038 AC2
  test('says so when nobody has rated yet', async ({ page }) => {
    await theMockExperienceScreens(page, (all) => (all.find(canoeId).counts = [0, 0, 0, 0, 0]));
    await page.goto(canoe);
    const detail = new ExperienceDetailPage(page);

    await expect(detail.scoreCard).toContainText('Nobody has rated it yet');
    await expect(detail.average).toHaveCount(0);
  });

  // L2-038 AC4
  test('lists what people said, each with their name, their stars and their words', async ({
    page,
  }) => {
    await theMockExperienceScreens(page);
    await page.goto(canoe);
    const detail = new ExperienceDetailPage(page);

    await expect(detail.commentsHeading).toBeVisible();
    await expect(detail.commentRows).toHaveCount(3);
    await expect(detail.firstComment).toContainText('Walt');
    await expect(detail.firstComment).toContainText('Rated 5');
    await expect(detail.commentBy('Dev')).toContainText('Cold, wet, would do it again tomorrow.');
  });

  // L2-052 AC2
  test('shows markup someone wrote as text', async ({ page }) => {
    await theMockExperienceScreens(page, (all) => {
      all.find(canoeId).said[0].text = '<img src=x onerror="document.title=1"> <b>bold</b>';
    });
    await page.goto(canoe);
    const detail = new ExperienceDetailPage(page);

    await expect(detail.firstComment).toContainText('<b>bold</b>');
    await expect(detail.firstComment.locator('b')).toHaveCount(0);
  });

  // L2-056 AC1
  test('says it is loading while the experience is on its way', async ({ page }) => {
    let release = () => {};
    await theMockExperienceScreens(page, (all) => (release = all.hold('detail')));
    await page.goto(canoe);
    const detail = new ExperienceDetailPage(page);

    await expect(detail.loading).toHaveText('Loading this experience…');
    release();
    await expect(detail.title).toHaveText('Sunrise canoe to Heron Point');
  });

  // L2-056 AC2
  test('says the experience did not load, and offers to try again or go back', async ({ page }) => {
    await theMockExperienceScreens(page, (all) => all.fail('detail'));
    await page.goto(canoe);
    const detail = new ExperienceDetailPage(page);

    await expect(detail.errorHeading).toHaveText('We couldn’t load this experience');
    await expect(detail.backToExperiences).toBeVisible();
    experiencesOf(page).recover('detail');
    await detail.tryAgain.click();

    await expect(detail.title).toHaveText('Sunrise canoe to Heron Point');
  });

  test('is not found when the experience is not in the Popkin', async ({ page }) => {
    await theMockExperienceScreens(page);
    await page.goto(experienceUrl('00000000-0000-4000-b000-999999999999'));

    await expect(new NotFoundPage(page).root).toBeVisible();
  });

  // L2-051 AC1
  test('is not found for someone who is not a member', async ({ page }) => {
    await theMockExperienceScreens(page, (all) => (all.notAMember = true));
    await page.goto(canoe);

    await expect(new NotFoundPage(page).root).toBeVisible();
  });

  // L2-058 AC8, AC11
  for (const [width, beside] of [
    [360, false],
    [768, false],
    [1024, true],
    [1280, true],
  ] as const) {
    test(`has its picture ${beside ? 'beside' : 'above'} its ratings at ${width} px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await theMockExperienceScreens(page);
      await page.goto(canoe);
      const detail = new ExperienceDetailPage(page);
      await expect(detail.title).toBeVisible();

      expect(await detail.sideBySide()).toBe(beside);
      await expect(detail.nav).toBeVisible({ visible: width >= 768 });
    });
  }
});

test.describe('Rating an experience', () => {
  // L2-039 AC1
  test('asks a member who has not rated, with five star buttons of at least 44 px', async ({
    page,
  }) => {
    await theMockExperienceScreens(page);
    await page.goto(canoe);
    const detail = new ExperienceDetailPage(page);

    await expect(detail.ratingHeading).toHaveText('How was it for you?');
    await expect(detail.starButtons).toHaveCount(5);
    await expect(detail.star(1)).toBeVisible();
    await expect(detail.star(5)).toBeVisible();
    await expect(detail.checkedStars).toHaveCount(0);
    await expect(detail.addComment).toHaveCount(0);
    const box = await detail.star(3).boundingBox();
    expect(Math.min(box?.width ?? 0, box?.height ?? 0)).toBeGreaterThanOrEqual(44);
  });

  // L2-039 AC2
  test('thanks the member, fills the stars, updates the score and offers a comment', async ({
    page,
  }) => {
    await theMockExperienceScreens(page);
    await page.goto(canoe);
    const detail = new ExperienceDetailPage(page);

    await detail.star(5).click();

    await expect(detail.ratingHeading).toHaveText('Thanks! Your rating');
    await expect(detail.checkedStars).toHaveCount(5);
    await expect(detail.count).toHaveText('12 ratings');
    await expect(detail.average).toHaveText('4.8');
    await expect(detail.addComment).toBeVisible();
    expect(experiencesOf(page).rated).toEqual([5]);
  });

  // L2-039 AC3
  test('changes the rating without changing the count', async ({ page }) => {
    await theMockExperienceScreens(page, (all) => {
      all.find(canoeId).mine = { stars: 5, comment: null };
    });
    await page.goto(canoe);
    const detail = new ExperienceDetailPage(page);
    await expect(detail.count).toHaveText('12 ratings');

    await detail.star(2).click();

    await expect(detail.checkedStars).toHaveCount(2);
    await expect(detail.average).toHaveText('4.5');
    await expect(detail.count).toHaveText('12 ratings');
  });

  // L2-039 AC4
  test('moves the rating by one star with the arrow keys, as a radio group does', async ({
    page,
  }) => {
    await theMockExperienceScreens(page, (all) => {
      all.find(canoeId).mine = { stars: 3, comment: null };
    });
    await page.goto(canoe);
    const detail = new ExperienceDetailPage(page);
    await detail.star(3).focus();

    await page.keyboard.press('ArrowRight');
    await expect(detail.star(4)).toBeFocused();
    await expect(detail.checkedStars).toHaveCount(4);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');

    await expect(detail.star(2)).toBeFocused();
    await expect(detail.checkedStars).toHaveCount(2);
    await expect.poll(() => experiencesOf(page).rated.at(-1)).toBe(2);
  });

  // L2-039 AC5
  test('puts the stars back and says so when the rating does not save', async ({ page }) => {
    await theMockExperienceScreens(page, (all) => all.break('rate'));
    await page.goto(canoe);
    const detail = new ExperienceDetailPage(page);
    const toasts = new Toasts(page);

    await detail.star(4).click();

    await expect(toasts.toast).toContainText('Your rating didn’t save');
    await expect(toasts.toast).toContainText('Your stars are back to how they were.');
    await expect(detail.checkedStars).toHaveCount(0);
    await expect(detail.ratingHeading).toHaveText('How was it for you?');
    await expect(detail.count).toHaveText('11 ratings');

    experiencesOf(page).mend('rate');
    await toasts.action('Try again').click();

    await expect(detail.checkedStars).toHaveCount(4);
    await expect(detail.ratingHeading).toHaveText('Thanks! Your rating');
    await expect(toasts.toast).toHaveCount(0);
  });

  // L2-037 AC3
  test('is not asked of something the group wants to do', async ({ page }) => {
    await theMockExperienceScreens(page);
    await page.goto(experienceUrl(beachId));
    const detail = new ExperienceDetailPage(page);

    await expect(detail.title).toHaveText('Beach day next summer?');
    await expect(detail.ratingPanel).toHaveCount(0);
    await expect(detail.scoreCard).toHaveCount(0);
  });
});

test.describe('Commenting on an experience', () => {
  const rated = (stars: number, comment: string | null = null) =>
    async function (page: import('@playwright/test').Page) {
      await theMockExperienceScreens(page, (all) => {
        const canoeing = all.find(canoeId);
        canoeing.mine = { stars, comment };
        if (comment) {
          canoeing.said.unshift({
            by: people.mara,
            stars,
            text: comment,
            at: new Date(2026, 8, 12, 10),
          });
        }
      });
      await page.goto(canoe);
    };

  // L2-041 AC1
  test('opens a dialog with the member’s stars and a "Your comment" field', async ({ page }) => {
    await rated(5)(page);
    const detail = new ExperienceDetailPage(page);

    await detail.addComment.click();

    const dialog = new AddCommentDialog(page);
    await expect(dialog.heading).toHaveText('Sunrise canoe to Heron Point');
    await expect(dialog.stars).toHaveAccessibleName('5 out of 5');
    await expect(dialog.yourRating).toBeVisible();
    await expect(dialog.comment).toBeFocused();
    await expect(dialog.hint).toHaveText('Up to 500 characters.');
    await expect(dialog.comment).toHaveAttribute('maxlength', '500');
  });

  // L2-041 AC2
  test('saves nothing for an empty comment, and says what to fix', async ({ page }) => {
    await rated(5)(page);
    const detail = new ExperienceDetailPage(page);
    await detail.addComment.click();
    const dialog = new AddCommentDialog(page);

    await dialog.comment.fill('   ');
    await dialog.action.click();

    await expect(dialog.error).toHaveText(
      'Write a few words, or close this to keep just your stars.',
    );
    await expect(dialog.comment).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.comment).toBeFocused();
    expect(experiencesOf(page).commented).toEqual([]);
  });

  // L2-041 AC3
  test('puts a saved comment first under "What people said", with the member’s stars', async ({
    page,
  }) => {
    await rated(5)(page);
    const detail = new ExperienceDetailPage(page);
    await detail.addComment.click();
    const dialog = new AddCommentDialog(page);

    await dialog.comment.fill('Would do it every morning if I could.');
    await dialog.action.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(detail.commentRows).toHaveCount(4);
    await expect(detail.firstComment).toContainText('Mara');
    await expect(detail.firstComment).toContainText('Rated 5');
    await expect(detail.firstComment).toContainText('Would do it every morning if I could.');
    await expect(detail.editComment).toBeVisible();
    await expect(detail.addComment).toHaveCount(0);
  });

  // L2-056 AC3
  test('reads "Posting…" and cannot be sent twice while it saves', async ({ page }) => {
    await rated(5)(page);
    const release = experiencesOf(page).holdChange('comment');
    const detail = new ExperienceDetailPage(page);
    await detail.addComment.click();
    const dialog = new AddCommentDialog(page);
    await dialog.comment.fill('Would do it every morning if I could.');

    await dialog.action.click();

    await expect(dialog.action).toHaveText('Posting…');
    await expect(dialog.action).toBeDisabled();
    await expect(dialog.comment).toHaveAttribute('readonly', '');
    release();
    await expect(dialog.root).toHaveCount(0);
    expect(experiencesOf(page).commented).toHaveLength(1);
  });

  test('keeps the words and says so when the comment does not save', async ({ page }) => {
    await rated(5)(page);
    experiencesOf(page).break('comment');
    const detail = new ExperienceDetailPage(page);
    await detail.addComment.click();
    const dialog = new AddCommentDialog(page);
    await dialog.comment.fill('Would do it every morning if I could.');

    await dialog.action.click();

    await expect(dialog.failed).toContainText('We couldn’t post that.');
    await expect(dialog.comment).toHaveValue('Would do it every morning if I could.');
    await expect(dialog.action).toBeEnabled();
    experiencesOf(page).mend('comment');
    await dialog.action.click();
    await expect(dialog.root).toHaveCount(0);
  });

  // L2-041 AC4
  test('opens with the member’s words to edit, and saving replaces them', async ({ page }) => {
    await rated(4, 'Cold.')(page);
    const detail = new ExperienceDetailPage(page);
    await expect(detail.commentRows).toHaveCount(4);

    await detail.editComment.click();
    const dialog = new AddCommentDialog(page);
    await expect(dialog.comment).toHaveValue('Cold.');
    await dialog.comment.fill('Cold, but worth it.');
    await dialog.action.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(detail.commentRows).toHaveCount(4);
    await expect(detail.firstComment).toContainText('Cold, but worth it.');
  });

  test('closes with Escape and returns to what opened it', async ({ page }) => {
    await rated(5)(page);
    const detail = new ExperienceDetailPage(page);
    await detail.addComment.click();
    const dialog = new AddCommentDialog(page);
    await expect(dialog.comment).toBeFocused();

    await page.keyboard.press('Escape');

    await expect(dialog.root).toHaveCount(0);
    await expect(detail.addComment).toBeFocused();
  });
});
