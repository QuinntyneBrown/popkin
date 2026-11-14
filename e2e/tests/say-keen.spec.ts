import { people } from '../fixtures/chat';
import { experienceStates } from '../fixtures/experience-states';
import {
  beachId,
  experienceUrl,
  experiencesOf,
  experiencesUrl,
  theMockExperienceScreens,
} from '../fixtures/experiences';
import { expect, test } from '../fixtures/pk-test';
import { wrappedUp } from '../fixtures/wrap-up';
import { ExperienceDetailPage } from '../pages/experience-detail.page';
import { ExperiencesPage } from '../pages/experiences.page';
import { Toasts } from '../pages/toasts';

const beach = experienceUrl(beachId);

test.describe('Saying you are keen', () => {
  // L2-042 AC1
  test('asks "Keen to do this?" in place of the rating, with who is keen', async ({ page }) => {
    await experienceStates.experienceDetailWant.before(page);
    await page.goto(beach);
    const detail = new ExperienceDetailPage(page);

    await expect(detail.keenHeading).toHaveText('Keen to do this?');
    await expect(detail.keenFaces).toHaveCount(4);
    await expect(detail.keenMore).toHaveText('+3');
    await expect(detail.keenCount).toHaveText('7 keen');
    await expect(detail.keenButton).toHaveAccessibleName('I’m keen');
    await expect(detail.keenButton).toHaveAttribute('aria-pressed', 'false');
    await expect(detail.ratingPanel).toHaveCount(0);
    await expect(detail.scoreCard).toHaveCount(0);
    await expect(detail.weDidThis).toHaveCount(0);
  });

  // L2-042 AC2
  test('presses the button, reads "You’re keen" and counts one more', async ({ page }) => {
    await experienceStates.experienceDetailWant.before(page);
    await page.goto(beach);
    const detail = new ExperienceDetailPage(page);

    await detail.keenButton.click();

    await expect(detail.keenButton).toHaveAttribute('aria-pressed', 'true');
    await expect(detail.keenButton).toHaveAccessibleName('You’re keen');
    await expect(detail.keenCount).toHaveText('8 keen');
    await expect(detail.keenMore).toHaveText('+4');
    expect(experiencesOf(page).keened).toEqual([true]);
  });

  // L2-042 AC3
  test('takes it back with "You’re keen", and counts one less', async ({ page }) => {
    await theMockExperienceScreens(page, (all) => {
      all.viewer = people.joel;
      all.host = false;
      all.find(beachId).iAmKeen = true;
    });
    await page.goto(beach);
    const detail = new ExperienceDetailPage(page);
    await expect(detail.keenButton).toHaveAccessibleName('You’re keen');

    await detail.keenButton.click();

    await expect(detail.keenButton).toHaveAttribute('aria-pressed', 'false');
    await expect(detail.keenButton).toHaveAccessibleName('I’m keen');
    await expect(detail.keenCount).toHaveText('6 keen');
    expect(experiencesOf(page).keened).toEqual([false]);
  });

  // L2-042 AC2, AC3: the toggle works from the keyboard, and once per press while it saves.
  test('toggles with the keyboard, and cannot be sent twice while it saves', async ({ page }) => {
    let release = () => {};
    await theMockExperienceScreens(page, (all) => {
      all.viewer = people.joel;
      all.host = false;
      release = all.holdChange('keen');
    });
    await page.goto(beach);
    const detail = new ExperienceDetailPage(page);
    await detail.keenButton.focus();

    await page.keyboard.press('Enter');

    await expect(detail.keenButton).toBeDisabled();
    release();
    await expect(detail.keenButton).toHaveAttribute('aria-pressed', 'true');
    await expect(detail.keenButton).toBeEnabled();
    await expect(detail.keenButton).toBeFocused();
    await page.keyboard.press('Space');
    await expect(detail.keenButton).toHaveAttribute('aria-pressed', 'false');
    expect(experiencesOf(page).keened).toEqual([true, false]);
  });

  test('stays as it was and says so when it does not save', async ({ page }) => {
    await theMockExperienceScreens(page, (all) => {
      all.viewer = people.joel;
      all.host = false;
      all.break('keen');
    });
    await page.goto(beach);
    const detail = new ExperienceDetailPage(page);
    const toasts = new Toasts(page);

    await detail.keenButton.click();

    await expect(toasts.toast).toContainText('Your keen didn’t save');
    await expect(toasts.toast).toContainText('It’s back to how it was.');
    await expect(detail.keenButton).toHaveAttribute('aria-pressed', 'false');
    await expect(detail.keenCount).toHaveText('7 keen');

    experiencesOf(page).mend('keen');
    await toasts.action('Try again').click();

    await expect(detail.keenButton).toHaveAttribute('aria-pressed', 'true');
    await expect(detail.keenCount).toHaveText('8 keen');
  });

  // L2-045: a wrapped-up Popkin keeps who was keen and takes nothing new.
  test('shows who was keen and offers no button once the Popkin has wrapped up', async ({
    page,
  }) => {
    await theMockExperienceScreens(page, (all, home) => {
      all.viewer = people.joel;
      all.host = false;
      all.wrappedUp = true;
      wrappedUp(home);
    });
    await page.goto(beach);
    const detail = new ExperienceDetailPage(page);

    await expect(detail.keenCount).toHaveText('7 keen');
    await expect(detail.keenButton).toHaveCount(0);
  });

  // L2-037 AC3: the list says how many are keen where a rating would be.
  test('the idea’s card counts who is keen under Want to do', async ({ page }) => {
    await experienceStates.experiencesWant.before(page);
    await page.goto(experiencesUrl);
    const experiences = new ExperiencesPage(page);

    await experiences.wantToDo.click();

    await expect(experiences.titles).toHaveText(['Beach day next summer?']);
    await expect(experiences.card('Beach day next summer?')).toContainText('7 keen');
  });

  // L2-058 AC2, AC11: the panel is under the picture on a phone, beside it from 1024 px.
  for (const [width, beside] of [
    [360, false],
    [1280, true],
  ] as const) {
    test(`keeps the toggle in reach ${beside ? 'beside' : 'under'} the picture at ${width} px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await experienceStates.experienceDetailWant.before(page);
      await page.goto(beach);
      const detail = new ExperienceDetailPage(page);

      await expect(detail.keenButton).toBeVisible();
      await expect.poll(() => detail.sideBySide()).toBe(beside);
      const box = await detail.keenButton.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    });
  }
});

test.describe('We did this', () => {
  // L2-042 AC4
  test('turns the sharer’s idea into something we did, which members can then rate', async ({
    page,
  }) => {
    await experienceStates.experienceDetailWantOwn.before(page);
    await page.goto(beach);
    const detail = new ExperienceDetailPage(page);

    await detail.weDidThis.click();

    await expect(detail.kind).toHaveText(/^Something we did/);
    await expect(detail.keenPanel).toHaveCount(0);
    await expect(detail.ratingHeading).toHaveText('How was it for you?');
    await expect(detail.scoreCard).toContainText('Nobody has rated it yet');
    expect(experiencesOf(page).done).toEqual([beachId]);

    await detail.star(4).click();

    await expect(detail.ratingHeading).toHaveText('Thanks! Your rating');
    await expect(detail.count).toHaveText('1 rating');
  });

  // L2-042 AC4: the Host may say it of any idea.
  test('is offered to the Host of an idea someone else shared', async ({ page }) => {
    await theMockExperienceScreens(page);
    await page.goto(beach);
    const detail = new ExperienceDetailPage(page);

    await detail.weDidThis.click();

    await expect(detail.ratingHeading).toHaveText('How was it for you?');
  });

  test('cannot be sent twice while it saves', async ({ page }) => {
    await experienceStates.experienceDetailWantOwn.before(page);
    const release = experiencesOf(page).holdChange('done');
    await page.goto(beach);
    const detail = new ExperienceDetailPage(page);

    await detail.weDidThis.click();

    await expect(detail.weDidThis).toBeDisabled();
    release();
    await expect(detail.ratingHeading).toHaveText('How was it for you?');
    expect(experiencesOf(page).done).toEqual([beachId]);
  });

  test('stays an idea and says so when it does not save', async ({ page }) => {
    await experienceStates.experienceDetailWantOwn.before(page);
    experiencesOf(page).break('done');
    await page.goto(beach);
    const detail = new ExperienceDetailPage(page);
    const toasts = new Toasts(page);

    await detail.weDidThis.click();

    await expect(toasts.toast).toContainText('That didn’t save');
    await expect(toasts.toast).toContainText('It’s still something you want to do.');
    await expect(detail.keenHeading).toHaveText('Keen to do this?');
    await expect(detail.weDidThis).toBeEnabled();

    experiencesOf(page).mend('done');
    await toasts.action('Try again').click();

    await expect(detail.ratingHeading).toHaveText('How was it for you?');
  });
});
