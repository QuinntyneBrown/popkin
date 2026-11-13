import path from 'node:path';
import type { Locator, Page } from '@playwright/test';
import {
  asVisitor,
  codeScreenAt24Seconds,
  howLongForLakeside,
  inviteFailsOnTheServer,
  joelAtTheMockInvite,
  joelWhoseJoinFails,
  joelWhoseJoinHangs,
  joinFromTheInvite,
  lakesideInvite,
  maraWithPhoto,
  theInviteFailing,
  theInviteLoading,
  theMockInvite,
  theMockWrappedInvite,
  withShareSheet,
} from './journeys';
import type { RouteKey } from './routes';
import { answer, hold, problem } from './stubs';
import { EndDateDialog } from '../pages/end-date.dialog';
import { HowLongPage } from '../pages/how-long.page';
import { JoinInvitePage } from '../pages/join-invite.page';
import { NameYourPopkinPage } from '../pages/name-your-popkin.page';
import { NotFoundPage } from '../pages/not-found.page';
import { PopkinCreatedPage } from '../pages/popkin-created.page';
import { ServerErrorPage } from '../pages/server-error.page';
import { SignUpPage } from '../pages/sign-up.page';
import { VerifyCodePage } from '../pages/verify-code.page';
import { YourProfilePage } from '../pages/your-profile.page';
import { YoureInPage } from '../pages/youre-in.page';
import responses from './api/responses.json';

/**
 * Every screen state the sweeps cover (ADR 0006): how to bring the app into it, and the regions
 * the visual sweep compares with the mock. The sweeps run only when the repository owner runs
 * `npm run sweeps`.
 */
export interface ScreenState {
  key: RouteKey;
  /** Before the app's page opens: stubs and init scripts. */
  before?: (page: Page) => Promise<void>;
  /** After it opens: the steps that reach the state. */
  app?: (page: Page) => Promise<void>;
  regions: (page: Page) => Record<string, Locator>;
  /** Regions that exist from 768 px only: the picture half of a split screen (L2-058 AC10). */
  wideRegions?: (page: Page) => Record<string, Locator>;
}

const verificationId = responses['POST /api/auth/codes'].body.verificationId;

const signUpPicture = (page: Page) => ({ picture: new SignUpPage(page).picture });
const codePicture = (page: Page) => ({ picture: new VerifyCodePage(page).picture });
const namePicture = (page: Page) => ({ picture: new NameYourPopkinPage(page).picture });
const lengthPicture = (page: Page) => ({ picture: new HowLongPage(page).picture });

const invitePicture = (page: Page) => ({ picture: new JoinInvitePage(page).picture });
const profilePicture = (page: Page) => ({ picture: new YourProfilePage(page).picture });
const portrait = path.join(__dirname, '../../docs/mocks/assets/images/call3.jpg');

const profileRegions = (page: Page) => {
  const p = new YourProfilePage(page);
  return { topBar: p.topBar, heading: p.heading, photo: p.photo, field: p.nameField };
};

const signUpRegions = (page: Page) => {
  const s = new SignUpPage(page);
  return { topBar: s.topBar, heading: s.heading, legal: s.legal, button: s.primaryButton };
};

export const screenStates: ScreenState[] = [
  {
    key: 'notFound',
    regions: (page) => {
      const p = new NotFoundPage(page);
      return { topBar: p.topBar, emptyState: p.emptyState };
    },
  },
  {
    key: 'serverErrorWithReference',
    before: inviteFailsOnTheServer,
    regions: (page) => ({ emptyState: new ServerErrorPage(page).emptyState }),
  },
  {
    key: 'signUp',
    app: (page) => new SignUpPage(page).fill('Mara', '(415) 555-0148'),
    regions: signUpRegions,
    wideRegions: signUpPicture,
  },
  {
    key: 'signUpEmail',
    app: (page) => new SignUpPage(page).fill('Mara', 'mara@hey.com', 'email'),
    regions: (page) => ({ ...signUpRegions(page), segmented: new SignUpPage(page).segmented }),
    wideRegions: signUpPicture,
  },
  {
    key: 'signUpInvalid',
    app: async (page) => {
      const s = new SignUpPage(page);
      await s.fill('Mara', '(415) 555-014');
      await s.submit();
    },
    regions: (page) => ({ ...signUpRegions(page), summary: new SignUpPage(page).summary }),
    wideRegions: signUpPicture,
  },
  {
    key: 'signUpSubmitting',
    before: async (page) => void (await hold(page, 'POST /api/auth/codes')),
    app: async (page) => {
      const s = new SignUpPage(page);
      await s.fill('Mara', '(415) 555-0148');
      await s.submit();
    },
    regions: signUpRegions,
    wideRegions: signUpPicture,
  },
  {
    key: 'signUpError',
    before: (page) => answer(page, 'POST /api/auth/codes', problem(503, 'code_not_sent')),
    app: async (page) => {
      const s = new SignUpPage(page);
      await s.fill('Mara', '(415) 555-0148');
      await s.submit();
    },
    regions: (page) => ({ ...signUpRegions(page), alert: new SignUpPage(page).alert }),
    wideRegions: signUpPicture,
  },
  {
    key: 'verifyCode',
    app: codeScreenAt24Seconds,
    regions: (page) => {
      const v = new VerifyCodePage(page);
      return { heading: v.heading, field: v.codeField, button: v.primaryButton };
    },
    wideRegions: codePicture,
  },
  {
    key: 'verifyCodeInvalid',
    before: (page) =>
      answer(
        page,
        `POST /api/auth/codes/${verificationId}/confirm`,
        problem(400, 'code_mismatch', { attemptsLeft: 4 }),
      ),
    app: async (page) => {
      await codeScreenAt24Seconds(page);
      await new VerifyCodePage(page).type('111111');
    },
    regions: (page) => ({ field: new VerifyCodePage(page).codeField }),
    wideRegions: codePicture,
  },
  {
    key: 'verifyCodeExpired',
    before: (page) =>
      answer(page, `POST /api/auth/codes/${verificationId}/confirm`, problem(400, 'code_expired')),
    app: async (page) => {
      await codeScreenAt24Seconds(page);
      await new VerifyCodePage(page).type('482913');
    },
    regions: (page) => ({ field: new VerifyCodePage(page).codeField }),
    wideRegions: codePicture,
  },
  {
    key: 'verifyCodeSubmitting',
    before: async (page) =>
      void (await hold(page, `POST /api/auth/codes/${verificationId}/confirm`)),
    app: async (page) => {
      await codeScreenAt24Seconds(page);
      await new VerifyCodePage(page).type('482913');
    },
    regions: (page) => ({ button: new VerifyCodePage(page).primaryButton }),
    wideRegions: codePicture,
  },
  {
    key: 'nameYourPopkin',
    before: maraWithPhoto,
    regions: (page) => {
      const n = new NameYourPopkinPage(page);
      return {
        preview: n.previewRow,
        emoji: n.emojiGrid,
        colours: n.swatches,
        button: n.footerButton,
      };
    },
    wideRegions: namePicture,
  },
  {
    key: 'nameYourPopkinFilled',
    before: maraWithPhoto,
    app: (page) => new NameYourPopkinPage(page).chooseLakeside(),
    regions: (page) => {
      const n = new NameYourPopkinPage(page);
      return {
        preview: n.previewRow,
        emoji: n.emojiGrid,
        colours: n.swatches,
        button: n.footerButton,
      };
    },
    wideRegions: namePicture,
  },
  {
    key: 'nameYourPopkinEdge',
    before: maraWithPhoto,
    app: async (page) => {
      const n = new NameYourPopkinPage(page);
      await n.chooseLakeside();
      await n.name.fill('The Brennan–Okafor Lakeside Reunion 2026');
    },
    regions: (page) => ({ preview: new NameYourPopkinPage(page).previewRow }),
    wideRegions: namePicture,
  },
  {
    key: 'howLong',
    app: howLongForLakeside,
    regions: (page) => ({
      heading: new HowLongPage(page).heading,
      group: new HowLongPage(page).group,
    }),
    wideRegions: lengthPicture,
  },
  {
    key: 'howLongCustom',
    app: async (page) => {
      await howLongForLakeside(page);
      await new HowLongPage(page).option('Until a date').click();
    },
    regions: (page) => ({
      group: new HowLongPage(page).group,
      date: new HowLongPage(page).dateButton,
    }),
    wideRegions: lengthPicture,
  },
  {
    key: 'howLongForever',
    app: async (page) => {
      await howLongForLakeside(page);
      await new HowLongPage(page).option('Keep it going').click();
    },
    regions: (page) => ({ group: new HowLongPage(page).group }),
    wideRegions: lengthPicture,
  },
  {
    key: 'howLongSubmitting',
    before: async (page) => void (await hold(page, 'POST /api/popkins')),
    app: async (page) => {
      await howLongForLakeside(page);
      await new HowLongPage(page).popItUp.click();
    },
    regions: (page) => ({ button: new HowLongPage(page).footerButton }),
    wideRegions: lengthPicture,
  },
  {
    key: 'howLongError',
    before: (page) => answer(page, 'POST /api/popkins', problem(500, 'unexpected')),
    app: async (page) => {
      await howLongForLakeside(page);
      await new HowLongPage(page).popItUp.click();
    },
    regions: (page) => ({ alert: new HowLongPage(page).alert, group: new HowLongPage(page).group }),
    wideRegions: lengthPicture,
  },
  {
    key: 'endDate',
    app: async (page) => {
      await howLongForLakeside(page);
      const h = new HowLongPage(page);
      await h.option('Until a date').click();
      await h.endDate.click();
    },
    regions: (page) => ({ panel: new EndDateDialog(page).panel }),
  },
  {
    key: 'endDateInvalid',
    app: async (page) => {
      await howLongForLakeside(page, new Date(2026, 10, 12, 8, 30));
      const h = new HowLongPage(page);
      await h.option('Until a date').click();
      await h.endDate.click();
      const d = new EndDateDialog(page);
      await d.day.fill('2026-11-12');
      await d.time.fill('09:00');
      await d.setTheEnd.click();
    },
    regions: (page) => ({ panel: new EndDateDialog(page).panel }),
  },
  {
    key: 'popkinCreated',
    before: async (page) => {
      await lakesideInvite(page);
      await withShareSheet(page);
    },
    regions: (page) => {
      const c = new PopkinCreatedPage(page);
      return { pop: c.pop, link: c.link, share: c.shareActions, button: c.footerButton };
    },
  },
  {
    key: 'popkinCreatedCopied',
    before: async (page) => {
      await lakesideInvite(page);
      await withShareSheet(page);
    },
    app: async (page) => {
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
      await new PopkinCreatedPage(page).copyLink.click();
    },
    regions: (page) => ({ share: new PopkinCreatedPage(page).shareActions }),
  },
  {
    key: 'joinInvite',
    before: theMockInvite,
    regions: (page) => {
      const i = new JoinInvitePage(page);
      return { wordmark: i.wordmark, preview: i.preview, button: i.primaryButton, note: i.note };
    },
    wideRegions: invitePicture,
  },
  {
    key: 'joinInviteLoading',
    before: theInviteLoading,
    regions: (page) => {
      const i = new JoinInvitePage(page);
      return { skeletons: i.skeletonGroup, button: i.buttonSkeleton };
    },
    wideRegions: invitePicture,
  },
  {
    key: 'joinInviteWrapped',
    before: theMockWrappedInvite,
    regions: (page) => {
      const i = new JoinInvitePage(page);
      return { preview: i.preview, button: i.startYourOwn };
    },
    wideRegions: invitePicture,
  },
  {
    key: 'joinInviteNotFound',
    before: async (page) => {
      await asVisitor(page);
      await answer(page, 'GET /api/invites/nosuchcode', problem(404, 'invite_not_found'));
    },
    regions: (page) => ({ emptyState: new JoinInvitePage(page).emptyState }),
  },
  {
    key: 'joinInviteError',
    before: theInviteFailing,
    regions: (page) => ({ emptyState: new JoinInvitePage(page).emptyState }),
  },
  {
    key: 'yourProfile',
    before: joelAtTheMockInvite,
    regions: profileRegions,
    wideRegions: profilePicture,
  },
  {
    key: 'yourProfileWithPhoto',
    before: joelAtTheMockInvite,
    app: (page) => new YourProfilePage(page).choosePhoto(portrait),
    regions: profileRegions,
    wideRegions: profilePicture,
  },
  {
    key: 'yourProfileInvalid',
    before: joelAtTheMockInvite,
    app: (page) => new YourProfilePage(page).name.fill(''),
    regions: profileRegions,
    wideRegions: profilePicture,
  },
  {
    key: 'yourProfileSubmitting',
    before: joelWhoseJoinHangs,
    app: (page) => new YourProfilePage(page).imIn.click(),
    regions: profileRegions,
    wideRegions: profilePicture,
  },
  {
    key: 'yourProfileError',
    before: joelWhoseJoinFails,
    app: (page) => new YourProfilePage(page).imIn.click(),
    regions: (page) => ({ ...profileRegions(page), alert: new YourProfilePage(page).alert }),
    wideRegions: profilePicture,
  },
  {
    key: 'youreIn',
    before: joelAtTheMockInvite,
    app: joinFromTheInvite,
    regions: (page) => ({ arrival: new YoureInPage(page).arrival }),
  },
];
