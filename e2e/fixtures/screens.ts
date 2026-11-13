import type { Locator, Page } from '@playwright/test';
import {
  codeScreenAt24Seconds,
  howLongForLakeside,
  inviteFailsOnTheServer,
  lakesideInvite,
  withShareSheet,
} from './journeys';
import type { RouteKey } from './routes';
import { answer, hold, problem } from './stubs';
import { EndDateDialog } from '../pages/end-date.dialog';
import { HowLongPage } from '../pages/how-long.page';
import { NameYourPopkinPage } from '../pages/name-your-popkin.page';
import { NotFoundPage } from '../pages/not-found.page';
import { PopkinCreatedPage } from '../pages/popkin-created.page';
import { ServerErrorPage } from '../pages/server-error.page';
import { SignUpPage } from '../pages/sign-up.page';
import { VerifyCodePage } from '../pages/verify-code.page';
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
}

const verificationId = responses['POST /api/auth/codes'].body.verificationId;

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
  },
  {
    key: 'signUpEmail',
    app: (page) => new SignUpPage(page).fill('Mara', 'mara@hey.com', 'email'),
    regions: (page) => ({ ...signUpRegions(page), segmented: new SignUpPage(page).segmented }),
  },
  {
    key: 'signUpInvalid',
    app: async (page) => {
      const s = new SignUpPage(page);
      await s.fill('Mara', '(415) 555-014');
      await s.submit();
    },
    regions: (page) => ({ ...signUpRegions(page), summary: new SignUpPage(page).summary }),
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
  },
  {
    key: 'verifyCode',
    app: codeScreenAt24Seconds,
    regions: (page) => {
      const v = new VerifyCodePage(page);
      return { heading: v.heading, field: v.codeField, button: v.primaryButton };
    },
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
  },
  {
    key: 'nameYourPopkin',
    regions: (page) => {
      const n = new NameYourPopkinPage(page);
      return {
        preview: n.previewRow,
        emoji: n.emojiGrid,
        colours: n.swatches,
        button: n.footerButton,
      };
    },
  },
  {
    key: 'nameYourPopkinFilled',
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
  },
  {
    key: 'nameYourPopkinEdge',
    app: async (page) => {
      const n = new NameYourPopkinPage(page);
      await n.chooseLakeside();
      await n.name.fill('The Brennan–Okafor Lakeside Reunion 2026');
    },
    regions: (page) => ({ preview: new NameYourPopkinPage(page).previewRow }),
  },
  {
    key: 'howLong',
    app: howLongForLakeside,
    regions: (page) => ({
      heading: new HowLongPage(page).heading,
      group: new HowLongPage(page).group,
    }),
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
  },
  {
    key: 'howLongForever',
    app: async (page) => {
      await howLongForLakeside(page);
      await new HowLongPage(page).option('Keep it going').click();
    },
    regions: (page) => ({ group: new HowLongPage(page).group }),
  },
  {
    key: 'howLongSubmitting',
    before: async (page) => void (await hold(page, 'POST /api/popkins')),
    app: async (page) => {
      await howLongForLakeside(page);
      await new HowLongPage(page).popItUp.click();
    },
    regions: (page) => ({ button: new HowLongPage(page).footerButton }),
  },
  {
    key: 'howLongError',
    before: (page) => answer(page, 'POST /api/popkins', problem(500, 'unexpected')),
    app: async (page) => {
      await howLongForLakeside(page);
      await new HowLongPage(page).popItUp.click();
    },
    regions: (page) => ({ alert: new HowLongPage(page).alert, group: new HowLongPage(page).group }),
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
];
