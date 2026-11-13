import { expect, type Page } from '@playwright/test';
import { AddCommentDialog } from '../pages/add-comment.dialog';
import { DeleteExperienceDialog } from '../pages/delete-experience.dialog';
import { ExperienceActionsDialog } from '../pages/experience-actions.dialog';
import { ExperienceDetailPage } from '../pages/experience-detail.page';
import { ExperiencesPage } from '../pages/experiences.page';
import { ShareExperienceDialog } from '../pages/share-experience.dialog';
import { people } from './chat';
import { type Experiences, beachId, canoeId, theMockExperienceScreens } from './experiences';
import type { RouteKey } from './routes';

/*
 * The states of Experiences the mocks draw, for the sweeps and the parity specs: `before` is
 * the step before the page opens, `app` what brings the open page to the state.
 */

type Arrange = (experiences: Experiences) => void;

const at = (arrange?: Arrange) => (page: Page) => theMockExperienceScreens(page, arrange);

/** Someone who neither shared the canoe nor is the Host: the mock draws no actions for them. */
const asRuth: Arrange = (all) => {
  all.viewer = people.ruth;
  all.host = false;
};
/** Joel neither shared the beach day nor is the Host, and is not keen on it yet (L2-042). */
const asJoel: Arrange = (all) => {
  all.viewer = people.joel;
  all.host = false;
};
/** Ellie shared the beach day and is keen on it: she may say "We did this" (L2-042 AC4). */
const asEllie: Arrange = (all) => {
  all.viewer = people.ellie;
  all.host = false;
  all.find(beachId).iAmKeen = true;
};
/** Ruth has given the canoe five stars, as the rated mock and the comment dialog draw. */
const rated: Arrange = (all) => {
  asRuth(all);
  all.find(canoeId).mine = { stars: 5, comment: null };
};

async function openShare(page: Page): Promise<ShareExperienceDialog> {
  await new ExperiencesPage(page).shareOne.click();
  const dialog = new ShareExperienceDialog(page);
  await expect(dialog.heading).toBeVisible();
  return dialog;
}

/** The dialog as the mocks fill it: the bonfire, on Saturday night. */
async function fillShare(page: Page): Promise<ShareExperienceDialog> {
  const dialog = await openShare(page);
  await dialog.title.fill('Bonfire songs on the beach');
  await dialog.when.fill('Sat night');
  return dialog;
}

async function openComment(page: Page, text: string): Promise<AddCommentDialog> {
  await new ExperienceDetailPage(page).addComment.click();
  const dialog = new AddCommentDialog(page);
  await dialog.comment.fill(text);
  return dialog;
}

async function openActions(page: Page): Promise<ExperienceActionsDialog> {
  await new ExperienceDetailPage(page).actions.click();
  const actions = new ExperienceActionsDialog(page);
  await expect(actions.menu).toBeVisible();
  return actions;
}

async function openDelete(page: Page): Promise<DeleteExperienceDialog> {
  await (await openActions(page)).delete.click();
  const confirm = new DeleteExperienceDialog(page);
  await expect(confirm.heading).toBeVisible();
  return confirm;
}

interface ExperienceState {
  before: (page: Page) => Promise<void>;
  app?: (page: Page) => Promise<void>;
}

export const experienceStates = {
  experiences: { before: at() },
  experiencesLoading: { before: at((all) => void all.hold('list')) },
  experiencesEmpty: { before: at((all) => all.empty()) },
  experiencesError: { before: at((all) => all.fail('list')) },
  experiencesDid: {
    before: at(),
    app: async (page) => {
      const experiences = new ExperiencesPage(page);
      await experiences.weDid.click();
      await expect(experiences.titles).toHaveCount(3);
    },
  },
  experiencesWant: {
    before: at(),
    app: async (page) => {
      const experiences = new ExperiencesPage(page);
      await experiences.wantToDo.click();
      await expect(experiences.titles).toHaveCount(1);
    },
  },
  experiencesNoResults: {
    before: at((all) => (all.shared = all.shared.filter((s) => s.kind !== 'Want'))),
    app: async (page) => {
      const experiences = new ExperiencesPage(page);
      await experiences.wantToDo.click();
      await expect(experiences.emptyHeading).toBeVisible();
    },
  },
  shareExperience: { before: at(), app: async (page) => void (await fillShare(page)) },
  shareExperienceBusy: {
    before: at((all) => void all.holdChange('share')),
    app: async (page) => {
      const dialog = await fillShare(page);
      await dialog.action.click();
      await expect(dialog.action).toBeDisabled();
    },
  },
  shareExperienceInvalid: {
    before: at(),
    app: async (page) => {
      const dialog = await openShare(page);
      await dialog.when.fill('Sat night');
      await dialog.action.click();
      await expect(dialog.summary).toBeVisible();
    },
  },
  shareExperienceFailed: {
    before: at((all) => all.break('share')),
    app: async (page) => {
      const dialog = await fillShare(page);
      await dialog.action.click();
      await expect(dialog.failed).toBeVisible();
    },
  },
  shareExperienceEdit: {
    before: at(),
    app: async (page) => {
      await (await openActions(page)).edit.click();
      await expect(new ShareExperienceDialog(page).picture).toBeVisible();
    },
  },
  experienceDetail: { before: at(asRuth) },
  experienceDetailRated: { before: at(rated) },
  experienceDetailOwn: { before: at() },
  experienceDetailWant: { before: at(asJoel) },
  experienceDetailWantKeen: {
    before: at(asJoel),
    app: async (page) => {
      const detail = new ExperienceDetailPage(page);
      await detail.keenButton.click();
      await expect(detail.keenButton).toHaveAttribute('aria-pressed', 'true');
    },
  },
  experienceDetailWantOwn: { before: at(asEllie) },
  experienceDetailLoading: {
    before: at((all) => {
      asRuth(all);
      all.hold('detail');
    }),
  },
  experienceDetailError: { before: at((all) => all.fail('detail')) },
  addComment: {
    before: at(rated),
    app: async (page) => void (await openComment(page, 'Would do it every morning if I could.')),
  },
  addCommentBusy: {
    before: at((all) => {
      rated(all);
      all.holdChange('comment');
    }),
    app: async (page) => {
      const dialog = await openComment(page, 'Would do it every morning if I could.');
      await dialog.action.click();
      await expect(dialog.action).toBeDisabled();
    },
  },
  addCommentInvalid: {
    before: at(rated),
    app: async (page) => {
      const dialog = await openComment(page, '');
      await dialog.action.click();
      await expect(dialog.error).toBeVisible();
    },
  },
  experienceActions: { before: at(), app: async (page) => void (await openActions(page)) },
  experienceActionsHost: { before: at(), app: async (page) => void (await openActions(page)) },
  deleteExperience: { before: at(), app: async (page) => void (await openDelete(page)) },
  deleteExperienceBusy: {
    before: at((all) => void all.holdChange('delete')),
    app: async (page) => {
      const confirm = await openDelete(page);
      await confirm.delete.click();
      await expect(confirm.delete).toBeDisabled();
    },
  },
  deleteExperienceFailed: {
    before: at((all) => all.break('delete')),
    app: async (page) => {
      const confirm = await openDelete(page);
      await confirm.delete.click();
      await expect(confirm.failed).toBeVisible();
    },
  },
} satisfies Partial<Record<RouteKey, ExperienceState>>;
