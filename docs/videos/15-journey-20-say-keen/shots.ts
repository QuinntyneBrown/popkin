import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { experienceStates } from '../../../e2e/fixtures/experience-states';
import { type Pk, test } from '../../../e2e/fixtures/pk-test';
import { ExperienceDetailPage } from '../../../e2e/pages/experience-detail.page';
import { ExperiencesPage } from '../../../e2e/pages/experiences.page';
import { detail, frame, shot, type Size, type Theme } from '../../../tools/video-record/shots';

/**
 * The screenshots of video 15: journey 20, Say keen, in the running app. The idea, "Beach day
 * next summer?", is opened by its keys in `e2e/fixtures/routes.ts`, with the states of
 * `e2e/fixtures/experience-states.ts`: Joel, a member, reads it (`experienceDetailWant`), and
 * Ellie, who shared it, reads it (`experienceDetailWantOwn`). Every /api request is answered in
 * memory by the fixtures of `e2e/` (ADR 0005); no backend and no database ran. Not a test and not
 * a sweep: only `node tools/video-record/record.mjs docs/videos/15-journey-20-say-keen` runs it.
 */

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

type Key = 'experienceDetailWant' | 'experienceDetailWantOwn';

/** Opens the idea as Joel or as Ellie, at a size and a theme. */
async function ideaAt(page: Page, pk: Pk, key: Key, size: Size, theme: Theme = 'light') {
  await frame(page, size, theme);
  await experienceStates[key].before(page);
  await pk.open(key);
  const idea = new ExperienceDetailPage(page);
  await expect(idea.keenHeading).toHaveText('Keen to do this?');
  await pictures(page);
  return idea;
}

/** Scrolls so the keen panel sits low in a phone's window, under the picture. */
async function panelInView(page: Page, idea: ExperienceDetailPage): Promise<void> {
  await idea.keenPanel.evaluate((el) => {
    const top = el.getBoundingClientRect().top + window.scrollY - 330;
    window.scrollTo({ top, behavior: 'instant' as ScrollBehavior });
  });
}

for (const size of SIZES) {
  test(`the idea at ${size}`, async ({ page, pk }) => {
    const idea = await ideaAt(page, pk, 'experienceDetailWant', size);
    if (size === 'XS') await panelInView(page, idea);
    await shot(page, `want-${lower(size)}`);
  });
}

test('the idea in the dark', async ({ page, pk }) => {
  const idea = await ideaAt(page, pk, 'experienceDetailWant', 'XS', 'dark');
  await panelInView(page, idea);
  await shot(page, 'want-xs-dark');
});

test('Joel says he is keen, then takes it back', async ({ page, pk }) => {
  const idea = await ideaAt(page, pk, 'experienceDetailWant', 'XS');
  await detail(idea.keenPanel, 'panel-want', 10);
  await detail(idea.keenButton, 'button-im-keen', 10);
  await idea.keenButton.click();
  await expect(idea.keenCount).toHaveText('8 keen');
  await page.mouse.move(0, 0);
  await idea.keenButton.blur();
  await detail(idea.keenPanel, 'panel-keen', 10);
  await detail(idea.keenButton, 'button-youre-keen', 10);
  await panelInView(page, idea);
  await shot(page, 'keen-xs');
  await idea.keenButton.click();
  await expect(idea.keenCount).toHaveText('7 keen');
  await page.mouse.move(0, 0);
  await idea.keenButton.blur();
  await detail(idea.keenPanel, 'panel-back', 10);
});

test('Ellie says "We did this", and it is ready to rate', async ({ page, pk }) => {
  const idea = await ideaAt(page, pk, 'experienceDetailWantOwn', 'XS');
  await panelInView(page, idea);
  await shot(page, 'own-xs');
  await detail(idea.keenPanel, 'panel-own', 10);
  await idea.weDidThis.click();
  await expect(idea.ratingHeading).toHaveText('How was it for you?');
  await page.mouse.move(0, 0);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }));
  await shot(page, 'done-xs');
  await detail(idea.kind, 'done-kind', 10);
  await detail(idea.ratingPanel, 'done-rate', 10);
  await frame(page, 'XL');
  await page.reload();
  await expect(idea.ratingHeading).toHaveText('How was it for you?');
  await pictures(page);
  await shot(page, 'done-xl');
});

test('the card of the idea under Want to do', async ({ page, pk }) => {
  await frame(page, 'XL');
  await experienceStates.experiencesWant.before(page);
  await pk.open('experiencesWant');
  const experiences = new ExperiencesPage(page);
  await experiences.wantToDo.click();
  await expect(experiences.titles).toHaveCount(1);
  await page.mouse.move(0, 0);
  await pictures(page);
  await shot(page, 'list-want-xl');
  await detail(experiences.card('Beach day next summer?'), 'card-beach', 10);
});
