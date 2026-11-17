import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { popkinId } from "../../../e2e/fixtures/chat";
import { homeUrl } from "../../../e2e/fixtures/home";
import { test } from "../../../e2e/fixtures/pk-test";
import {
  burnDownUrl,
  maraWithAPlan,
  openNewStory,
  openStory,
  planUrl,
  story,
} from "../../../e2e/fixtures/plan";
import { recapUrl, theMockRecap } from "../../../e2e/fixtures/wrap-up";
import { BurnDownPage } from "../../../e2e/pages/burn-down.page";
import { PlanBoardPage } from "../../../e2e/pages/plan-board.page";
import { PopkinHomePage } from "../../../e2e/pages/popkin-home.page";
import { RecapPage } from "../../../e2e/pages/recap.page";
import {
  detail,
  frame,
  shot,
  type Size,
  type Theme,
} from "../../../tools/video-record/shots";

/**
 * The screenshots of video 23: journey 21, Make the plan, in the running app. Mara opens the
 * Plan of Cabin Week ’27: the plan board with its sprint chip, "New story", the Story dialog and
 * "Mark done", a story another member adds arriving live, the burn-down at 7 behind with its
 * forecast, the home's Plan section, the recap's count and the screen while Plan is off. The
 * answers are those of `e2e/fixtures/plan.ts` and `wrap-up.ts`; the hub is `e2e/fixtures/hub.ts`
 * (ADR 0005, ADR 0010); no backend and no database ran. Not a test and not a sweep: only
 * `node tools/video-record/record.mjs docs/videos/10-journey-21-make-the-plan` runs it.
 */

const lower = (size: Size) => size.toLowerCase();
const SIZES = ["XS", "M", "L", "XL"] as const satisfies readonly Size[];

/** Takes the pointer and the focus ring away, so a shot shows the state, not the hover. */
async function still(page: Page): Promise<void> {
  await page.mouse.move(0, 0);
  await page.evaluate(() =>
    (document.activeElement as HTMLElement | null)?.blur?.(),
  );
}

/** The plan board of the mocks: fourteen stories, 24 points left, 7 behind. */
async function board(page: Page, size: Size, theme: Theme = "light") {
  await frame(page, size, theme);
  const plan = await maraWithAPlan(page);
  await page.goto(planUrl);
  const view = new PlanBoardPage(page);
  await expect(view.cards).toHaveCount(14);
  await expect(view.sprintChip).toBeVisible();
  await still(page);
  return { plan, view };
}

test("the board at every size, and in the dark", async ({ page }) => {
  for (const size of SIZES) {
    await board(page, size);
    await shot(page, `board-${lower(size)}`);
  }
  const { view } = await board(page, "XL");
  await detail(view.sprintChip, "chip", 12);
  await detail(view.column("Doing").root, "doing", 12);
  await board(page, "XS", "dark");
  await shot(page, "board-xs-dark");
});

test("New story, as a sheet and as a panel, and the board after it", async ({
  page,
}) => {
  await board(page, "XS");
  await openNewStory(page);
  await still(page);
  await shot(page, "new-xs");

  const { view } = await board(page, "L");
  const dialog = await openNewStory(page);
  await still(page);
  await shot(page, "new-l");
  await dialog.action.click();
  await expect(dialog.root).toHaveCount(0);
  await expect(view.column("To do").titles).toContainText([
    "Who brings what: packing list",
  ]);
  await still(page);
  await shot(page, "added-l");
  await detail(view.column("To do").root, "todo-added", 12);
});

test("a story moved on and marked done", async ({ page }) => {
  const { view } = await board(page, "L");
  const dialog = await openStory(page);
  await still(page);
  await shot(page, "story-l");
  await detail(dialog.footer, "story-actions", 12);
  await dialog.markDone.click();
  await expect(dialog.root).toHaveCount(0);
  await expect(view.column("Done").titles).toContainText([
    "Book the cabin at Pine Hollow",
  ]);
  await still(page);
  await shot(page, "done-l");
  await detail(view.column("Done").root, "done-col", 12);
});

test("a story another member adds arrives without a reload", async ({
  page,
  hub,
}) => {
  const { plan, view } = await board(page, "XL");
  await hub.connected();
  await expect.poll(() => plan.reads).toBeGreaterThanOrEqual(2);
  await detail(view.column("To do").root, "live-before", 12);
  plan.stories.push(story("Pack the first-aid kit", "ToDo", 1, "Stay"));
  plan.version = 2;
  await hub.push("PlanChanged", popkinId, 2);
  await expect(view.column("To do").titles).toContainText([
    "Pack the first-aid kit",
  ]);
  await still(page);
  await shot(page, "live-xl");
  await detail(view.column("To do").root, "live-after", 12);
});

test("the burn-down, on a desktop and a phone", async ({ page }) => {
  for (const size of ["XS", "XL"] as const) {
    await frame(page, size);
    await maraWithAPlan(page);
    await page.goto(burnDownUrl);
    const view = new BurnDownPage(page);
    await expect(view.badge).toHaveText("7 behind");
    await expect(view.chart).toBeVisible();
    await still(page);
    await shot(page, `burn-${lower(size)}`);
    if (size === "XL") {
      await detail(page.locator(".burn__main"), "burn-main", 12);
      await detail(view.biggest, "biggest", 12);
    }
  }
});

test("the home’s Plan section, the recap’s count, and Plan off", async ({
  page,
}) => {
  await frame(page, "XL");
  await maraWithAPlan(page);
  await page.goto(homeUrl);
  const home = new PopkinHomePage(page);
  await expect(home.planStatus).toHaveText("7 behind");
  await still(page);
  await shot(page, "home-xl");
  await detail(home.plan, "home-plan", 12);

  await frame(page, "XL");
  await theMockRecap(
    page,
    (wrapUp) => (wrapUp.recap.stories = { done: 12, made: 14 }),
  );
  await page.goto(recapUrl);
  const recap = new RecapPage(page);
  await expect(recap.plan).toContainText("12 of 14 stories done");
  await still(page);
  await shot(page, "recap-xl");
  await detail(recap.plan, "recap-plan", 12);

  await frame(page, "XS");
  const plan = await maraWithAPlan(page);
  plan.fail("off");
  await page.goto(planUrl);
  await expect(new PlanBoardPage(page).off).toBeVisible();
  await still(page);
  await shot(page, "off-xs");
});
