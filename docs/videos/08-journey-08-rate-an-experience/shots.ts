import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import {
  type Experiences,
  canoeId,
  experienceUrl,
  experiencesUrl,
  theMockExperienceScreens,
} from '../../../e2e/fixtures/experiences';
import { homeUrl } from '../../../e2e/fixtures/home';
import { aPhoto } from '../../../e2e/fixtures/photos';
import { test } from '../../../e2e/fixtures/pk-test';
import { AddCommentDialog } from '../../../e2e/pages/add-comment.dialog';
import { DeleteExperienceDialog } from '../../../e2e/pages/delete-experience.dialog';
import { ExperienceActionsDialog } from '../../../e2e/pages/experience-actions.dialog';
import { ExperienceDetailPage } from '../../../e2e/pages/experience-detail.page';
import { ExperiencesPage } from '../../../e2e/pages/experiences.page';
import { PopkinHomePage } from '../../../e2e/pages/popkin-home.page';
import { ShareExperienceDialog } from '../../../e2e/pages/share-experience.dialog';
import { Toasts } from '../../../e2e/pages/toasts';
import { bringToTop, detail, frame, shot, type Size } from '../../../tools/video-record/shots';

/**
 * The screenshots of video 08: journey 8, Rate an experience, in the running app. Every /api
 * request is answered in memory by `e2e/fixtures/experiences.ts`, the home's stub or the
 * recording (ADR 0005); no backend and no database ran. The member is Mara, the Host of Lakeside
 * Weekend, on the mocks' Saturday; the experiences are the mocks' four. Not a test and not a
 * sweep: only `node tools/video-record/record.mjs docs/videos/08-journey-08-rate-an-experience`
 * runs it.
 */

const canoe = experienceUrl(canoeId);
const closeUp = (region: Locator, name: string, pad = 12) => detail(region, name, pad);
const at = (page: Page, arrange?: (all: Experiences) => void) =>
  theMockExperienceScreens(page, arrange);

/** Waits until every picture on the page has arrived. */
async function pictures(page: Page): Promise<void> {
  await page.evaluate(() =>
    Promise.all(
      [...document.images].map((image) => image.complete || image.decode().catch(() => undefined)),
    ),
  );
}

async function openList(page: Page, count = 4): Promise<ExperiencesPage> {
  await page.goto(experiencesUrl);
  const experiences = new ExperiencesPage(page);
  await expect(experiences.titles).toHaveCount(count);
  await pictures(page);
  return experiences;
}

async function openCanoe(page: Page): Promise<ExperienceDetailPage> {
  await page.goto(canoe);
  const one = new ExperienceDetailPage(page);
  await expect(one.title).toHaveText('Sunrise canoe to Heron Point');
  await expect(one.average).toBeVisible();
  await pictures(page);
  return one;
}

test('Experiences: the cards and the filters, from 390 to 1440 px, and in the dark', async ({
  page,
}) => {
  await at(page);
  for (const size of ['XS', 'M', 'L', 'XL'] as const satisfies readonly Size[]) {
    await frame(page, size);
    const experiences = await openList(page);
    await shot(page, `list-${size.toLowerCase()}`);
    if (size === 'XS') {
      await closeUp(experiences.header, 'list-header', 0);
      await closeUp(experiences.filters, 'filters-all', 10);
      await closeUp(experiences.card('Sunrise canoe'), 'card-canoe', 10);
      await closeUp(experiences.card('Beach day'), 'card-beach', 10);
      await closeUp(experiences.fab, 'share-one', 12);

      await experiences.weDid.click();
      await expect(experiences.titles).toHaveCount(3);
      await pictures(page);
      await bringToTop(experiences.header, 0);
      await shot(page, 'list-did-xs');
      await closeUp(experiences.filters, 'filters-did', 10);

      await experiences.wantToDo.click();
      await expect(experiences.titles).toHaveCount(1);
      await pictures(page);
      await bringToTop(experiences.header, 0);
      await shot(page, 'list-want-xs');
      await closeUp(experiences.filters, 'filters-want', 10);
    }
  }
  await frame(page, 'XS', 'dark');
  await openList(page);
  await shot(page, 'list-xs-dark');
});

test('Share one: the dialog, then the experience first in the list with its toast', async ({
  page,
}) => {
  await at(page);
  await frame(page, 'XS');
  const experiences = await openList(page);
  await experiences.shareOne.click();
  const dialog = new ShareExperienceDialog(page);
  await expect(dialog.heading).toBeVisible();
  await shot(page, 'share-empty-xs');

  await dialog.title.fill('Bonfire songs on the beach');
  await dialog.when.fill('Sat night');
  await dialog.place.fill('The cove');
  await dialog.choose(aPhoto('bonfire.jpg'));
  await expect(dialog.picture).toBeVisible();
  await pictures(page);
  // Choosing the picture scrolls the dialog to it; asking for its heading back does not move it,
  // so the filled dialog is filmed from its title's field down to "Share it".
  await dialog.heading.evaluate((heading) => heading.scrollIntoView({ block: 'center' }));
  await shot(page, 'share-filled-xs');
  await closeUp(dialog.kindField, 'share-kinds', 8);
  await dialog.action.scrollIntoViewIfNeeded();
  await shot(page, 'share-filled-end-xs');

  await dialog.action.click();
  await expect(dialog.root).toHaveCount(0);
  await expect(experiences.titles).toHaveCount(5);
  await expect(experiences.titles.first()).toHaveText('Bonfire songs on the beach');
  const toasts = new Toasts(page);
  await expect(toasts.toast).toContainText('Experience shared');
  await pictures(page);
  await shot(page, 'shared-xs');
  await closeUp(toasts.toast, 'toast-shared', 0);
  await closeUp(experiences.card('Bonfire songs'), 'card-bonfire', 10);
});

test('an experience: its page and the group’s score, from 390 to 1440 px', async ({ page }) => {
  await at(page);
  for (const size of ['XS', 'M', 'L', 'XL'] as const satisfies readonly Size[]) {
    await frame(page, size);
    const one = await openCanoe(page);
    await shot(page, `detail-${size.toLowerCase()}`);
    if (size === 'XS') {
      await closeUp(one.intro, 'detail-intro', 8);
      await closeUp(one.scoreCard, 'score', 8);
      await closeUp(one.ratingPanel, 'rating-ask', 8);
      await bringToTop(one.scoreCard, 24);
      await shot(page, 'detail-score-xs');
    }
    if (size === 'XL') await closeUp(one.rest, 'detail-rest-xl', 0);
  }
});

test('rating with the five stars, then a comment first under "What people said"', async ({
  page,
}) => {
  await at(page);
  await frame(page, 'XS');
  const one = await openCanoe(page);
  await one.star(5).click();
  await expect(one.ratingHeading).toHaveText('Thanks! Your rating');
  await expect(one.count).toHaveText('12 ratings');
  await expect(one.average).toHaveText('4.8');
  await expect(one.addComment).toBeVisible();
  await bringToTop(one.scoreCard, 24);
  await shot(page, 'rated-xs');
  await closeUp(one.scoreCard, 'score-rated', 8);
  await closeUp(one.ratingPanel, 'rating-thanks', 8);

  await one.addComment.click();
  const dialog = new AddCommentDialog(page);
  await dialog.comment.fill('Would do it every morning if I could.');
  await shot(page, 'comment-dialog-xs');
  await closeUp(dialog.panel, 'comment-dialog', 0);
  await dialog.action.click();
  await expect(dialog.root).toHaveCount(0);
  await expect(one.commentRows).toHaveCount(4);
  await expect(one.firstComment).toContainText('Would do it every morning if I could.');
  await expect(one.editComment).toBeVisible();
  await pictures(page);
  await bringToTop(one.ratingPanel, 24);
  await shot(page, 'commented-xs');
  await closeUp(one.firstComment, 'comment-first', 10);
  await closeUp(one.ratingPanel, 'rating-edit-comment', 8);
});

test('the actions of an experience for its sharer: edit, and delete with its confirmation', async ({
  page,
}) => {
  await at(page);
  await frame(page, 'XS');
  const one = await openCanoe(page);
  await closeUp(one.picture, 'detail-picture', 0);
  await one.actions.click();
  const actions = new ExperienceActionsDialog(page);
  await expect(actions.items).toHaveText(['Edit', 'Delete']);
  await shot(page, 'actions-xs');
  await closeUp(actions.panel, 'actions-dialog', 0);

  await actions.edit.click();
  const edit = new ShareExperienceDialog(page);
  await expect(edit.heading).toHaveText('Edit experience');
  await expect(edit.picture).toBeVisible();
  await pictures(page);
  await shot(page, 'edit-xs');
  await edit.close.click();
  await expect(edit.root).toHaveCount(0);

  await one.actions.click();
  await new ExperienceActionsDialog(page).delete.click();
  const confirm = new DeleteExperienceDialog(page);
  await expect(confirm.heading).toHaveText('Delete this experience?');
  await shot(page, 'delete-xs');
  await closeUp(confirm.panel, 'delete-dialog', 0);

  await confirm.delete.click();
  const experiences = new ExperiencesPage(page);
  await expect(experiences.titles).toHaveCount(3);
  const toasts = new Toasts(page);
  await expect(toasts.toast).toContainText('Experience deleted');
  await pictures(page);
  await shot(page, 'deleted-xs');
  await closeUp(toasts.toast, 'toast-deleted', 0);
});

test('the highest rated on the Popkin home', async ({ page }) => {
  await at(page);
  for (const size of ['XS', 'M'] as const) {
    await frame(page, size);
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);
    await home.firstExperience.waitFor();
    await home.memberRows.first().waitFor();
    await pictures(page);
    await bringToTop(home.experiences, size === 'XS' ? 180 : 120);
    await pictures(page);
    await shot(page, `home-${size.toLowerCase()}`);
    await closeUp(home.experiences, `home-experiences-${size.toLowerCase()}`, 0);
  }
});
