import { ChangeLengthDialog } from '../pages/change-length.dialog';
import { EditPopkinDialog } from '../pages/edit-popkin.dialog';
import { settingsStates } from './settings-states';
import { ConversationsPage } from '../pages/conversations.page';
import { DirectMessagePage } from '../pages/direct-message.page';
import { NewMessageDialog } from '../pages/new-message.dialog';
import { directMessageStates } from './direct-message-states';
import { LandingPage } from '../pages/landing.page';
import { WelcomePage } from '../pages/welcome.page';
import { PopkinSettingsDialog } from '../pages/popkin-settings.dialog';
import { RecapPage } from '../pages/recap.page';
import { WrapUpPage } from '../pages/wrap-up.page';
import { WrapUpBanner } from '../pages/wrap-up-banner';
import { wrapUpStates } from './wrap-up-states';
import { leaveStates } from './leave-states';
import path from 'node:path';
import { expect, type Locator, type Page } from '@playwright/test';
import { callStates } from './call-states';
import { experienceStates } from './experience-states';
import { AddCommentDialog } from '../pages/add-comment.dialog';
import { DeleteExperienceDialog } from '../pages/delete-experience.dialog';
import { LeavePopkinDialog } from '../pages/leave-popkin.dialog';
import { ExperienceActionsDialog } from '../pages/experience-actions.dialog';
import { ExperienceDetailPage } from '../pages/experience-detail.page';
import { ExperiencesPage } from '../pages/experiences.page';
import { ShareExperienceDialog } from '../pages/share-experience.dialog';
import { CallBanner } from '../pages/call-banner';
import { VideoCallPage } from '../pages/video-call.page';
import {
  aMessageArrivesBelow,
  sendTheReplyToRuth,
  theChatEmpty,
  theChatFailing,
  theChatLoading,
  theChatWhoseSendsFail,
  theChatWithManyMessages,
  theMockChat,
  writeTwoOffline,
} from './chat';
import {
  copyTheInvite,
  openTheInvite,
  theHomeEmpty,
  theHomeFailing,
  theHomeLoading,
  theHomeWithoutPhotos,
  theMockHome,
} from './home';
import {
  asVisitor,
  inviteCode,
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
import {
  addTheThreeSlowly,
  addTheThreeWithOneFailing,
  chooseOneTooLarge,
  chooseTheThree,
  theAlbumEmpty,
  theAlbumFailing,
  theAlbumLoading,
  theAlbumWithoutMine,
  theMockPhotos,
  thePhotoFailing,
  thePhotoLoading,
} from './photos';
import {
  openTheScanner,
  scanAPopkinAndWait,
  scanSomethingElse,
  theMockPopkins,
  thePopkinsActiveOnly,
  thePopkinsEmpty,
  thePopkinsFailing,
  thePopkinsGoOffline,
  thePopkinsLoading,
  withACamera,
} from './my-popkins';
import type { RouteKey } from './routes';
import { answer, hold, problem } from './stubs';
import { EndDateDialog } from '../pages/end-date.dialog';
import { InviteDialog } from '../pages/invite.dialog';
import { PopkinHomePage } from '../pages/popkin-home.page';
import { GroupChatPage } from '../pages/group-chat.page';
import { HowLongPage } from '../pages/how-long.page';
import { JoinInvitePage } from '../pages/join-invite.page';
import { NameYourPopkinPage } from '../pages/name-your-popkin.page';
import { MyPopkinsPage } from '../pages/my-popkins.page';
import { NotFoundPage } from '../pages/not-found.page';
import { OfflinePage } from '../pages/offline.page';
import { ScanToJoinDialog } from '../pages/scan-to-join.dialog';
import { SignInPage } from '../pages/sign-in.page';
import { PopkinCreatedPage } from '../pages/popkin-created.page';
import { ServerErrorPage } from '../pages/server-error.page';
import { JoinCodePage } from '../pages/join-code.page';
import { joinCodeStates } from './join-code';
import { SignUpPage } from '../pages/sign-up.page';
import { VerifyCodePage } from '../pages/verify-code.page';
import { YourProfilePage } from '../pages/your-profile.page';
import { YoureInPage } from '../pages/youre-in.page';
import { AddPhotosDialog } from '../pages/add-photos.dialog';
import { PhotoAlbumPage } from '../pages/photo-album.page';
import { PhotoViewPage } from '../pages/photo-view.page';
import responses from './api/responses.json';
import { theAccountFailing, theAccountLoading } from './account';
import { accountStates } from './account-states';
import { AccountPage } from '../pages/account.page';
import { DeleteAccountDialog } from '../pages/delete-account.dialog';
import { SignOutDialog } from '../pages/sign-out.dialog';

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

const joinCodePicture = (page: Page) => ({ picture: new JoinCodePage(page).picture });
const joinCodeRegions = (page: Page) => {
  const j = new JoinCodePage(page);
  return { topBar: j.topBar, heading: j.heading, field: j.field };
};

const signUpRegions = (page: Page) => {
  const s = new SignUpPage(page);
  return { topBar: s.topBar, heading: s.heading, legal: s.legal, button: s.primaryButton };
};

const experiencesRegions = (page: Page) => {
  const experiences = new ExperiencesPage(page);
  return { header: experiences.header, body: experiences.body };
};
const shareRegions = (page: Page) => ({ dialog: new ShareExperienceDialog(page).panel });
const detailRegions = (page: Page) => ({ detail: new ExperienceDetailPage(page).detail });
/** An idea: the mock draws comments without stars, which the app has no way to add yet. */
const ideaRegions = (page: Page) => {
  const detail = new ExperienceDetailPage(page);
  return { lead: detail.lead, keen: detail.keenPanel };
};
const commentRegions = (page: Page) => ({ dialog: new AddCommentDialog(page).panel });
const actionsRegions = (page: Page) => ({ dialog: new ExperienceActionsDialog(page).panel });
const deleteRegions = (page: Page) => ({ dialog: new DeleteExperienceDialog(page).panel });
const leaveRegions = (page: Page) => ({ dialog: new LeavePopkinDialog(page).panel });
const editRegions = (page: Page) => ({ dialog: new EditPopkinDialog(page).panel });
const lengthRegions = (page: Page) => ({ dialog: new ChangeLengthDialog(page).panel });
const wrapUpRegions = (page: Page) => {
  const wrapUp = new WrapUpPage(page);
  return { main: wrapUp.main, picture: wrapUp.picture };
};
const recapRegions = (page: Page) => ({ recap: new RecapPage(page).recap });
const warningRegions = (page: Page) => ({ banner: new WrapUpBanner(page).root });

const accountRegions = (page: Page) => {
  const account = new AccountPage(page);
  return { topBar: account.topBar, main: account.screen.getByRole('main') };
};

export const screenStates: ScreenState[] = [
  // The account (journey 17) and deleting it (journey 19).
  { key: 'account', ...accountStates.account, regions: accountRegions },
  {
    key: 'accountLoading',
    before: async (page) => void (await theAccountLoading(page)),
    regions: accountRegions,
  },
  { key: 'accountError', before: theAccountFailing, regions: accountRegions },
  { key: 'accountInvalid', ...accountStates.accountInvalid, regions: accountRegions },
  { key: 'accountSubmitting', ...accountStates.accountSubmitting, regions: accountRegions },
  { key: 'accountSuccess', ...accountStates.accountSuccess, regions: accountRegions },
  {
    key: 'signOut',
    ...accountStates.signOut,
    regions: (page) => ({ dialog: new SignOutDialog(page).panel }),
  },
  {
    key: 'signOutBusy',
    ...accountStates.signOutBusy,
    regions: (page) => ({ dialog: new SignOutDialog(page).panel }),
  },
  {
    key: 'deleteAccount',
    ...accountStates.deleteAccount,
    regions: (page) => ({ dialog: new DeleteAccountDialog(page).panel }),
  },
  {
    key: 'deleteAccountConfirm',
    ...accountStates.deleteAccountConfirm,
    regions: (page) => ({ dialog: new DeleteAccountDialog(page).panel }),
  },
  {
    key: 'deleteAccountBusy',
    ...accountStates.deleteAccountBusy,
    regions: (page) => ({ dialog: new DeleteAccountDialog(page).panel }),
  },
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
    key: 'joinCode',
    ...joinCodeStates.joinCode,
    regions: joinCodeRegions,
    wideRegions: joinCodePicture,
  },
  {
    key: 'joinCodeSubmitting',
    ...joinCodeStates.joinCodeSubmitting,
    regions: joinCodeRegions,
    wideRegions: joinCodePicture,
  },
  {
    key: 'joinCodeInvalid',
    ...joinCodeStates.joinCodeInvalid,
    regions: joinCodeRegions,
    wideRegions: joinCodePicture,
  },
  {
    key: 'joinCodeBlank',
    ...joinCodeStates.joinCodeBlank,
    regions: joinCodeRegions,
    wideRegions: joinCodePicture,
  },
  {
    key: 'joinCodeError',
    ...joinCodeStates.joinCodeError,
    regions: joinCodeRegions,
    wideRegions: joinCodePicture,
  },
  {
    key: 'joinCodeLimited',
    ...joinCodeStates.joinCodeLimited,
    regions: joinCodeRegions,
    wideRegions: joinCodePicture,
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
  // The Everyone thread. Regions are the parts the mock and the app both draw: reactions,
  // replies, photos and the composer's tools come with later journeys.
  {
    key: 'groupChat',
    before: theMockChat,
    regions: (page) => {
      const chat = new GroupChatPage(page);
      return {
        titles: chat.titles,
        dayDivider: chat.dayDividers.first(),
        note: chat.notes.first(),
        send: chat.send,
      };
    },
  },
  {
    key: 'groupChatLoading',
    before: theChatLoading,
    regions: (page) => ({ skeletons: new GroupChatPage(page).skeletonRows }),
  },
  {
    key: 'groupChatEmpty',
    before: theChatEmpty,
    regions: (page) => {
      const chat = new GroupChatPage(page);
      return { titles: chat.titles, empty: chat.empty };
    },
  },
  {
    key: 'groupChatError',
    before: theChatFailing,
    regions: (page) => ({ empty: new GroupChatPage(page).empty }),
  },
  {
    key: 'groupChatFailedSend',
    before: theChatWhoseSendsFail,
    app: sendTheReplyToRuth,
    regions: (page) => ({ titles: new GroupChatPage(page).titles }),
  },
  {
    key: 'groupChatOffline',
    before: theMockChat,
    app: writeTwoOffline,
    regions: (page) => ({ banner: new GroupChatPage(page).banner }),
  },
  {
    key: 'groupChatNewMessages',
    before: theChatWithManyMessages,
    app: aMessageArrivesBelow,
    regions: (page) => ({ titles: new GroupChatPage(page).titles }),
  },
  // The Popkin home. "Popkin settings" is journey 9, so the header is compared by its parts.
  {
    key: 'popkinHome',
    before: theMockHome,
    regions: (page) => {
      const home = new PopkinHomePage(page);
      return {
        time: home.timeLeft,
        chat: home.chat,
        photos: home.photos,
        experiences: home.experiences,
        members: home.members,
      };
    },
  },
  {
    key: 'popkinHomeLoading',
    before: theHomeLoading,
    regions: (page) => {
      const home = new PopkinHomePage(page);
      return { header: home.header, skeleton: home.bodySkeleton };
    },
  },
  {
    key: 'popkinHomeEmpty',
    before: theHomeEmpty,
    regions: (page) => {
      const home = new PopkinHomePage(page);
      return { chat: home.chat, photos: home.photos, experiences: home.experiences };
    },
  },
  {
    key: 'popkinHomeError',
    before: theHomeFailing,
    regions: (page) => ({ error: new PopkinHomePage(page).error }),
  },
  {
    key: 'popkinHomePartial',
    before: theHomeWithoutPhotos,
    regions: (page) => ({ photos: new PopkinHomePage(page).photos }),
  },
  // The QR code itself differs from the mock's sample, so the dialog is compared around it.
  {
    key: 'inviteDialog',
    before: theMockHome,
    app: openTheInvite,
    regions: (page) => {
      const dialog = new InviteDialog(page);
      return { header: dialog.header, name: dialog.name, link: dialog.link, footer: dialog.footer };
    },
  },
  {
    key: 'inviteDialogCopied',
    before: theMockHome,
    app: copyTheInvite,
    regions: (page) => ({ footer: new InviteDialog(page).footer }),
  },
  // Photos. Below 640 px the mock leaves three of Friday's photos out, so the album is compared
  // by its header and its first day.
  {
    key: 'photoAlbum',
    before: theMockPhotos,
    regions: (page) => {
      const album = new PhotoAlbumPage(page);
      return { header: album.header, day: album.firstDay, grid: album.firstGrid };
    },
  },
  {
    key: 'photoAlbumLoading',
    before: theAlbumLoading,
    regions: (page) => {
      const album = new PhotoAlbumPage(page);
      return { header: album.header, skeleton: album.albumSkeleton };
    },
  },
  {
    key: 'photoAlbumEmpty',
    before: theAlbumEmpty,
    regions: (page) => {
      const album = new PhotoAlbumPage(page);
      return { header: album.header, empty: album.empty };
    },
  },
  {
    key: 'photoAlbumError',
    before: theAlbumFailing,
    regions: (page) => ({ error: new PhotoAlbumPage(page).error }),
  },
  {
    key: 'photoAlbumMine',
    before: theMockPhotos,
    app: (page) => new PhotoAlbumPage(page).mine.click(),
    regions: (page) => {
      const album = new PhotoAlbumPage(page);
      return { header: album.header, grid: album.firstGrid };
    },
  },
  {
    key: 'photoAlbumNoResults',
    before: theAlbumWithoutMine,
    app: (page) => new PhotoAlbumPage(page).mine.click(),
    regions: (page) => {
      const album = new PhotoAlbumPage(page);
      return { header: album.header, empty: album.empty };
    },
  },
  // Add photos. The busy mock draws all three on their way and the bar 62 % full, and the
  // failed mock draws no mark on the two that are in the album, so those are compared by row.
  {
    key: 'addPhotos',
    before: theMockPhotos,
    app: chooseTheThree,
    regions: (page) => ({ panel: new AddPhotosDialog(page).panel }),
  },
  {
    key: 'addPhotosInvalid',
    before: theMockPhotos,
    app: chooseOneTooLarge,
    regions: (page) => ({ panel: new AddPhotosDialog(page).panel }),
  },
  {
    key: 'addPhotosBusy',
    before: theMockPhotos,
    app: (page) => addTheThreeSlowly(page),
    regions: (page) => {
      const dialog = new AddPhotosDialog(page);
      return { rows: dialog.list, footer: dialog.footer };
    },
  },
  {
    key: 'addPhotosFailed',
    before: theMockPhotos,
    app: addTheThreeWithOneFailing,
    regions: (page) => {
      const dialog = new AddPhotosDialog(page);
      return { outcome: dialog.outcome, failed: dialog.row(3), footer: dialog.footer };
    },
  },
  // The photo view. "Save photo", the reactions, the comments and the react bar are journey 14.
  {
    key: 'photoView',
    before: theMockPhotos,
    regions: (page) => ({ caption: new PhotoViewPage(page).captionRegion }),
  },
  {
    key: 'photoViewLoading',
    before: thePhotoLoading,
    regions: (page) => ({ stage: new PhotoViewPage(page).stage }),
  },
  {
    key: 'photoViewError',
    before: thePhotoFailing,
    regions: (page) => ({ error: new PhotoViewPage(page).error }),
  },
  // Journey 6. Sign in, the name step of the code screen, My Popkins, Scan to join and the
  // offline screen. The scanner is compared while the browser still asks for the camera: the
  // mocks draw no camera picture.
  {
    key: 'signIn',
    app: (page) => new SignInPage(page).contact.fill('mara@hey.com'),
    regions: (page) => {
      const signIn = new SignInPage(page);
      return {
        topBar: signIn.topBar,
        field: signIn.contactField,
        button: signIn.primaryButton,
        link: signIn.startAPopkinRegion,
      };
    },
    wideRegions: (page) => ({ picture: new SignInPage(page).picture }),
  },
  {
    key: 'signInInvalid',
    app: async (page) => {
      const signIn = new SignInPage(page);
      await signIn.contact.fill('mara@hey');
      await signIn.send.click();
      await signIn.contactError.waitFor();
    },
    regions: (page) => ({ field: new SignInPage(page).contactField }),
  },
  {
    key: 'signInSubmitting',
    before: async (page) => void (await hold(page, 'POST /api/auth/codes')),
    app: async (page) => {
      const signIn = new SignInPage(page);
      await signIn.contact.fill('mara@hey.com');
      await signIn.send.click();
    },
    regions: (page) => ({ button: new SignInPage(page).primaryButton }),
  },
  {
    key: 'verifyCodeName',
    app: async (page) => {
      const id = responses['POST /api/auth/codes'].body.verificationId;
      await answer(page, `POST /api/auth/codes/${id}/confirm`, {
        status: 200,
        body: { outcome: 'NameRequired', session: null, isNewPerson: true },
      });
      const verify = new VerifyCodePage(page);
      await verify.reachBySignIn();
      await verify.type('482913');
      await verify.name.waitFor();
    },
    regions: (page) => {
      const verify = new VerifyCodePage(page);
      return { heading: verify.heading, button: verify.primaryButton };
    },
  },
  {
    key: 'myPopkins',
    before: theMockPopkins,
    regions: (page) => {
      const popkins = new MyPopkinsPage(page);
      return {
        topBar: popkins.topBar,
        grid: popkins.grid,
        wrappedUpHeading: popkins.wrappedUpHeading,
        wrappedUp: popkins.wrappedUpList,
      };
    },
  },
  {
    key: 'myPopkinsActiveOnly',
    before: thePopkinsActiveOnly,
    regions: (page) => ({ grid: new MyPopkinsPage(page).grid }),
  },
  {
    key: 'myPopkinsLoading',
    before: thePopkinsLoading,
    regions: (page) => ({ skeleton: new MyPopkinsPage(page).skeletonCards }),
  },
  {
    key: 'myPopkinsEmpty',
    before: thePopkinsEmpty,
    regions: (page) => {
      const popkins = new MyPopkinsPage(page);
      return { topBar: popkins.topBar, empty: popkins.emptyState };
    },
  },
  {
    key: 'myPopkinsError',
    before: thePopkinsFailing,
    regions: (page) => ({ error: new MyPopkinsPage(page).emptyState }),
  },
  {
    key: 'myPopkinsOffline',
    before: theMockPopkins,
    app: thePopkinsGoOffline,
    regions: (page) => {
      const popkins = new MyPopkinsPage(page);
      return { banner: popkins.offlineBanner, grid: popkins.grid };
    },
  },
  {
    key: 'scanToJoin',
    before: withACamera('asking'),
    app: openTheScanner,
    regions: (page) => ({ panel: new ScanToJoinDialog(page).panel }),
  },
  {
    key: 'scanToJoinBusy',
    before: withACamera('allowed'),
    app: scanAPopkinAndWait,
    regions: (page) => {
      const scan = new ScanToJoinDialog(page);
      return { header: scan.header, hint: scan.hint, footer: scan.footer };
    },
  },
  {
    key: 'scanToJoinInvalid',
    before: withACamera('allowed'),
    app: scanSomethingElse,
    regions: (page) => {
      const scan = new ScanToJoinDialog(page);
      return { alert: scan.alert, footer: scan.footer };
    },
  },
  {
    key: 'scanToJoinDenied',
    before: withACamera('denied'),
    app: openTheScanner,
    regions: (page) => ({ panel: new ScanToJoinDialog(page).panel }),
  },
  {
    key: 'offline',
    regions: (page) => {
      const offline = new OfflinePage(page);
      return { empty: offline.emptyState };
    },
  },
  {
    key: 'videoCall',
    ...callStates.videoCall,
    regions: (page) => {
      const call = new VideoCallPage(page);
      return { topBar: call.topBar, controls: call.controls, aside: call.aside };
    },
  },
  {
    key: 'videoCallTwo',
    ...callStates.videoCallTwo,
    regions: (page) => ({ controls: new VideoCallPage(page).controls }),
  },
  {
    key: 'videoCallMuted',
    ...callStates.videoCallMuted,
    regions: (page) => ({ controls: new VideoCallPage(page).controls }),
  },
  {
    key: 'videoCallCameraOff',
    ...callStates.videoCallCameraOff,
    regions: (page) => ({ controls: new VideoCallPage(page).controls }),
  },
  {
    key: 'videoCallLoading',
    ...callStates.videoCallLoading,
    regions: (page) => ({ screen: new VideoCallPage(page).root }),
  },
  {
    key: 'videoCallEmpty',
    ...callStates.videoCallEmpty,
    regions: (page) => {
      const call = new VideoCallPage(page);
      return { message: call.message, controls: call.controls };
    },
  },
  {
    key: 'videoCallError',
    ...callStates.videoCallError,
    regions: (page) => ({ screen: new VideoCallPage(page).root }),
  },
  {
    key: 'bannerInfo',
    ...callStates.bannerInfo,
    regions: (page) => ({ banner: new CallBanner(page).root }),
  },
  // Experiences (journey 8).
  { key: 'experiences', ...experienceStates.experiences, regions: experiencesRegions },
  {
    key: 'experiencesLoading',
    ...experienceStates.experiencesLoading,
    regions: experiencesRegions,
  },
  { key: 'experiencesEmpty', ...experienceStates.experiencesEmpty, regions: experiencesRegions },
  { key: 'experiencesError', ...experienceStates.experiencesError, regions: experiencesRegions },
  { key: 'experiencesDid', ...experienceStates.experiencesDid, regions: experiencesRegions },
  { key: 'experiencesWant', ...experienceStates.experiencesWant, regions: experiencesRegions },
  {
    key: 'experiencesNoResults',
    ...experienceStates.experiencesNoResults,
    regions: experiencesRegions,
  },
  { key: 'shareExperience', ...experienceStates.shareExperience, regions: shareRegions },
  { key: 'shareExperienceBusy', ...experienceStates.shareExperienceBusy, regions: shareRegions },
  {
    key: 'shareExperienceInvalid',
    ...experienceStates.shareExperienceInvalid,
    regions: shareRegions,
  },
  {
    key: 'shareExperienceFailed',
    ...experienceStates.shareExperienceFailed,
    regions: shareRegions,
  },
  { key: 'shareExperienceEdit', ...experienceStates.shareExperienceEdit, regions: shareRegions },
  { key: 'experienceDetail', ...experienceStates.experienceDetail, regions: detailRegions },
  {
    key: 'experienceDetailRated',
    ...experienceStates.experienceDetailRated,
    regions: detailRegions,
  },
  { key: 'experienceDetailOwn', ...experienceStates.experienceDetailOwn, regions: detailRegions },
  // Say keen (journey 20).
  { key: 'experienceDetailWant', ...experienceStates.experienceDetailWant, regions: ideaRegions },
  {
    key: 'experienceDetailWantKeen',
    ...experienceStates.experienceDetailWantKeen,
    regions: ideaRegions,
  },
  {
    key: 'experienceDetailWantOwn',
    ...experienceStates.experienceDetailWantOwn,
    regions: ideaRegions,
  },
  {
    key: 'experienceDetailLoading',
    ...experienceStates.experienceDetailLoading,
    regions: detailRegions,
  },
  { key: 'addComment', ...experienceStates.addComment, regions: commentRegions },
  { key: 'addCommentBusy', ...experienceStates.addCommentBusy, regions: commentRegions },
  { key: 'addCommentInvalid', ...experienceStates.addCommentInvalid, regions: commentRegions },
  { key: 'experienceActions', ...experienceStates.experienceActions, regions: actionsRegions },
  {
    key: 'experienceActionsHost',
    ...experienceStates.experienceActionsHost,
    regions: actionsRegions,
  },
  { key: 'deleteExperience', ...experienceStates.deleteExperience, regions: deleteRegions },
  { key: 'deleteExperienceBusy', ...experienceStates.deleteExperienceBusy, regions: deleteRegions },
  {
    key: 'deleteExperienceFailed',
    ...experienceStates.deleteExperienceFailed,
    regions: deleteRegions,
  },
  {
    key: 'experienceDetailError',
    ...experienceStates.experienceDetailError,
    regions: (page) => ({ error: new ExperienceDetailPage(page).error }),
  },
  // Wrap up (journey 9).
  {
    key: 'popkinSettings',
    ...wrapUpStates.popkinSettings,
    regions: (page) => ({ dialog: new PopkinSettingsDialog(page).panel }),
  },
  {
    key: 'popkinSettingsMember',
    ...wrapUpStates.popkinSettingsMember,
    regions: (page) => ({ dialog: new PopkinSettingsDialog(page).panel }),
  },
  // Change Popkin settings (journey 16).
  { key: 'editPopkin', ...settingsStates.editPopkin, regions: editRegions },
  { key: 'editPopkinBusy', ...settingsStates.editPopkinBusy, regions: editRegions },
  { key: 'editPopkinInvalid', ...settingsStates.editPopkinInvalid, regions: editRegions },
  { key: 'editPopkinFailed', ...settingsStates.editPopkinFailed, regions: editRegions },
  { key: 'changeLength', ...settingsStates.changeLength, regions: lengthRegions },
  { key: 'changeLengthBusy', ...settingsStates.changeLengthBusy, regions: lengthRegions },
  { key: 'changeLengthFailed', ...settingsStates.changeLengthFailed, regions: lengthRegions },
  // Leave a Popkin (journey 18).
  { key: 'leavePopkin', ...leaveStates.leavePopkin, regions: leaveRegions },
  { key: 'leavePopkinBusy', ...leaveStates.leavePopkinBusy, regions: leaveRegions },
  { key: 'leavePopkinFailed', ...leaveStates.leavePopkinFailed, regions: leaveRegions },
  { key: 'wrapUp', ...wrapUpStates.wrapUp, regions: wrapUpRegions },
  { key: 'wrapUpAlbumOff', ...wrapUpStates.wrapUpAlbumOff, regions: wrapUpRegions },
  { key: 'wrapUpSubmitting', ...wrapUpStates.wrapUpSubmitting, regions: wrapUpRegions },
  {
    key: 'wrapUpError',
    ...wrapUpStates.wrapUpError,
    regions: (page) => ({ ...wrapUpRegions(page), alert: new WrapUpPage(page).alert }),
  },
  { key: 'recap', ...wrapUpStates.recap, regions: recapRegions },
  { key: 'recapHost', ...wrapUpStates.recapHost, regions: recapRegions },
  { key: 'recapPlain', ...wrapUpStates.recapPlain, regions: recapRegions },
  { key: 'recapExporting', ...wrapUpStates.recapExporting, regions: recapRegions },
  {
    key: 'recapLoading',
    ...wrapUpStates.recapLoading,
    regions: (page) => ({ skeletons: new RecapPage(page).skeletons }),
  },
  {
    key: 'recapError',
    ...wrapUpStates.recapError,
    regions: (page) => ({ error: new RecapPage(page).error }),
  },
  { key: 'recapGoing', ...wrapUpStates.recapGoing, regions: warningRegions },
  { key: 'popkinHomeLastHour', ...wrapUpStates.popkinHomeLastHour, regions: warningRegions },
  {
    key: 'popkinHomeLastHourMember',
    ...wrapUpStates.popkinHomeLastHourMember,
    regions: warningRegions,
  },
  {
    key: 'groupChatReadOnly',
    ...wrapUpStates.groupChatReadOnly,
    regions: (page) => {
      const chat = new GroupChatPage(page);
      return { topBar: chat.topBar, composer: chat.composer };
    },
  },
  {
    key: 'photoAlbumWrapped',
    ...wrapUpStates.photoAlbumWrapped,
    regions: (page) => ({ header: new PhotoAlbumPage(page).header }),
  },
  { key: 'photoAlbumGoing', ...wrapUpStates.photoAlbumGoing, regions: warningRegions },
  {
    key: 'photoAlbumRemoved',
    ...wrapUpStates.photoAlbumRemoved,
    regions: (page) => {
      const album = new PhotoAlbumPage(page);
      return { header: album.header, empty: album.empty };
    },
  },
  { key: 'experiencesWrapped', ...wrapUpStates.experiencesWrapped, regions: experiencesRegions },
  {
    key: 'experienceDetailWrapped',
    ...wrapUpStates.experienceDetailWrapped,
    regions: detailRegions,
  },
  // Discover Popkin (journey 10).
  {
    key: 'landing',
    before: asVisitor,
    regions: (page) => {
      const landing = new LandingPage(page);
      return {
        nav: landing.nav,
        hero: landing.heroText,
        how: landing.how,
        ideas: landing.ideas,
        comparison: landing.comparison,
        free: landing.free,
        footer: landing.footer,
      };
    },
  },
  {
    key: 'welcome',
    before: asVisitor,
    regions: (page) => ({ welcome: new WelcomePage(page).welcome }),
    wideRegions: (page) => ({ aside: new WelcomePage(page).aside }),
  },
  ...(
    ['conversations', 'conversationsLoading', 'conversationsEmpty', 'conversationsError'] as const
  ).map((key) => ({
    key,
    ...directMessageStates[key],
    regions: (page: Page) => {
      const chat = new ConversationsPage(page);
      return { topBar: chat.topBar, list: chat.list };
    },
    wideRegions: (page: Page) => ({ thread: new ConversationsPage(page).threadPaneHead }),
  })),
  ...(['newMessage', 'newMessageNoResults'] as const).map((key) => ({
    key,
    ...directMessageStates[key],
    regions: (page: Page) => ({ panel: new NewMessageDialog(page).panel }),
  })),
  ...(
    [
      'directMessage',
      'directMessageLoading',
      'directMessageEmpty',
      'directMessageError',
      'directMessageReadOnly',
      'directMessageCall',
    ] as const
  ).map((key) => ({
    key,
    ...directMessageStates[key],
    regions: (page: Page) => {
      const direct = new DirectMessagePage(page);
      return { topBar: direct.topBar, composer: direct.composer };
    },
    wideRegions: (page: Page) => ({ list: new DirectMessagePage(page).listPane }),
  })),
];
