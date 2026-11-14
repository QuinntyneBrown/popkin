import responses from './api/responses.json';

/**
 * Every screen state the suite opens, keyed once so one spec serves both targets: the Angular
 * app (`app` path) and the design reference (`mock` file under docs/mocks, opened when
 * PK_BASELINE=1 or PK_PARITY=mocks). `mock` is absent until the screen has one.
 */
export interface ScreenRoute {
  app: string;
  mock?: string;
}

const created = responses['POST /api/popkins'].body;
const invite = `/i/${created.inviteCode}`;
const chat = `/p/${created.id}/chat/everyone`;
const home = `/p/${created.id}`;
const call = `${home}/call`;
const photos = `${home}/photos`;
// The photo the mocks open: the first of the album fixture.
const photo = `${photos}/00000000-0000-4000-a000-000000000018`;
const experiences = `${home}/experiences`;
// The experience the mocks open: the sunrise canoe to Heron Point.
const experience = `${experiences}/00000000-0000-4000-a000-000000000081`;
const wrapUp = `${home}/wrap-up`;
const conversations = `${home}/chat`;
// The direct message the mocks open: with Walt, by his membership (`people.walt` in chat.ts).
const directMessage = `${conversations}/00000000-0000-4000-8000-walt00000000`;
const recap = `${home}/recap`;
// One the signed-in Host did not share: Ellie's idea, a beach day next summer.
const idea = `${experiences}/00000000-0000-4000-b000-000000000001`;

/** Where the suite serves the marketing site, a second application (ADR 0017). */
export const MARKETING = 'http://localhost:4201';
/** The app's address the marketing site is built with in development (`APP_URL`). */
export const MARKETING_APP_URL = 'http://localhost:4200';

export const routes = {
  account: { app: '/account', mock: 'pages/account/default.html' },
  accountLoading: { app: '/account', mock: 'pages/account/loading.html' },
  accountError: { app: '/account', mock: 'pages/account/error.html' },
  accountInvalid: { app: '/account', mock: 'pages/account/invalid.html' },
  accountSubmitting: { app: '/account', mock: 'pages/account/submitting.html' },
  accountSuccess: { app: '/account', mock: 'pages/account/success.html' },
  signOut: { app: '/account', mock: 'dialogs/sign-out/default.html' },
  signOutBusy: { app: '/account', mock: 'dialogs/sign-out/busy.html' },
  deleteAccount: { app: '/account', mock: 'dialogs/delete-account/default.html' },
  deleteAccountConfirm: { app: '/account', mock: 'dialogs/delete-account/confirm.html' },
  deleteAccountBusy: { app: '/account', mock: 'dialogs/delete-account/busy.html' },
  landing: { app: '/', mock: 'pages/landing/default.html' },
  // The marketing site (ADR 0017), a second application served on :4201.
  marketingHome: { app: `${MARKETING}/`, mock: 'pages/marketing-home/default.html' },
  marketingHomePlaying: { app: `${MARKETING}/`, mock: 'pages/marketing-home/playing.html' },
  welcome: { app: '/welcome', mock: 'pages/welcome/default.html' },
  signIn: { app: '/sign-in', mock: 'pages/sign-in/default.html' },
  signInInvalid: { app: '/sign-in', mock: 'pages/sign-in/invalid.html' },
  signInSubmitting: { app: '/sign-in', mock: 'pages/sign-in/submitting.html' },
  verifyCodeName: { app: '/verify', mock: 'pages/verify-code/name.html' },
  offline: { app: '/offline', mock: 'pages/offline/default.html' },
  myPopkins: { app: '/popkins', mock: 'pages/my-popkins/default.html' },
  myPopkinsActiveOnly: { app: '/popkins', mock: 'pages/my-popkins/active-only.html' },
  myPopkinsLoading: { app: '/popkins', mock: 'pages/my-popkins/loading.html' },
  myPopkinsEmpty: { app: '/popkins', mock: 'pages/my-popkins/empty.html' },
  myPopkinsError: { app: '/popkins', mock: 'pages/my-popkins/error.html' },
  myPopkinsOffline: { app: '/popkins', mock: 'pages/my-popkins/offline.html' },
  scanToJoin: { app: '/popkins', mock: 'dialogs/scan-to-join/default.html' },
  scanToJoinBusy: { app: '/popkins', mock: 'dialogs/scan-to-join/busy.html' },
  scanToJoinInvalid: { app: '/popkins', mock: 'dialogs/scan-to-join/invalid.html' },
  scanToJoinDenied: { app: '/popkins', mock: 'dialogs/scan-to-join/denied.html' },
  joinCode: { app: '/join', mock: 'pages/join-code/default.html' },
  joinCodeSubmitting: { app: '/join', mock: 'pages/join-code/submitting.html' },
  joinCodeInvalid: { app: '/join', mock: 'pages/join-code/invalid.html' },
  joinCodeBlank: { app: '/join', mock: 'pages/join-code/blank.html' },
  joinCodeError: { app: '/join', mock: 'pages/join-code/error.html' },
  joinCodeLimited: { app: '/join', mock: 'pages/join-code/limited.html' },
  signUp: { app: '/sign-up', mock: 'pages/sign-up/default.html' },
  signUpEmail: { app: '/sign-up', mock: 'pages/sign-up/email.html' },
  signUpError: { app: '/sign-up', mock: 'pages/sign-up/error.html' },
  signUpSubmitting: { app: '/sign-up', mock: 'pages/sign-up/submitting.html' },
  signUpInvalid: { app: '/sign-up', mock: 'pages/sign-up/invalid.html' },
  verifyCode: { app: '/verify', mock: 'pages/verify-code/default.html' },
  verifyCodeInvalid: { app: '/verify', mock: 'pages/verify-code/invalid.html' },
  verifyCodeExpired: { app: '/verify', mock: 'pages/verify-code/expired.html' },
  verifyCodeSubmitting: { app: '/verify', mock: 'pages/verify-code/submitting.html' },
  nameYourPopkin: { app: '/new', mock: 'pages/name-your-popkin/blank.html' },
  nameYourPopkinFilled: { app: '/new', mock: 'pages/name-your-popkin/default.html' },
  nameYourPopkinEdge: { app: '/new', mock: 'pages/name-your-popkin/edge.html' },
  howLong: { app: '/new/length', mock: 'pages/how-long/default.html' },
  howLongCustom: { app: '/new/length', mock: 'pages/how-long/custom.html' },
  howLongForever: { app: '/new/length', mock: 'pages/how-long/forever.html' },
  howLongSubmitting: { app: '/new/length', mock: 'pages/how-long/submitting.html' },
  howLongError: { app: '/new/length', mock: 'pages/how-long/error.html' },
  endDate: { app: '/new/length', mock: 'dialogs/end-date/default.html' },
  endDateInvalid: { app: '/new/length', mock: 'dialogs/end-date/invalid.html' },
  popkinCreated: { app: `/p/${created.id}/created`, mock: 'pages/popkin-created/default.html' },
  popkinCreatedCopied: {
    app: `/p/${created.id}/created`,
    mock: 'pages/popkin-created/copied.html',
  },
  joinInvite: { app: invite, mock: 'pages/join-invite/default.html' },
  joinInviteLoading: { app: invite, mock: 'pages/join-invite/loading.html' },
  joinInviteWrapped: { app: invite, mock: 'pages/join-invite/wrapped.html' },
  joinInviteNotFound: { app: '/i/nosuchcode', mock: 'pages/join-invite/not-found.html' },
  joinInviteError: { app: invite, mock: 'pages/join-invite/error.html' },
  yourProfile: { app: `${invite}/profile`, mock: 'pages/your-profile/default.html' },
  yourProfileWithPhoto: { app: `${invite}/profile`, mock: 'pages/your-profile/with-photo.html' },
  yourProfileInvalid: { app: `${invite}/profile`, mock: 'pages/your-profile/invalid.html' },
  yourProfileSubmitting: { app: `${invite}/profile`, mock: 'pages/your-profile/submitting.html' },
  yourProfileError: { app: `${invite}/profile`, mock: 'pages/your-profile/error.html' },
  youreIn: { app: `${invite}/welcome`, mock: 'pages/youre-in/default.html' },
  popkinHome: { app: home, mock: 'pages/popkin-home/default.html' },
  popkinHomeLoading: { app: home, mock: 'pages/popkin-home/loading.html' },
  popkinHomeEmpty: { app: home, mock: 'pages/popkin-home/empty.html' },
  popkinHomeError: { app: home, mock: 'pages/popkin-home/error.html' },
  popkinHomePartial: { app: home, mock: 'pages/popkin-home/partial.html' },
  bannerInfo: { app: home, mock: 'notifications/banner/info.html' },
  videoCall: { app: call, mock: 'pages/video-call/default.html' },
  videoCallTwo: { app: `${directMessage}/call`, mock: 'pages/video-call/two.html' },
  videoCallMuted: { app: call, mock: 'pages/video-call/muted.html' },
  videoCallCameraOff: { app: call, mock: 'pages/video-call/camera-off.html' },
  videoCallLoading: { app: call, mock: 'pages/video-call/loading.html' },
  videoCallEmpty: { app: call, mock: 'pages/video-call/empty.html' },
  videoCallError: { app: call, mock: 'pages/video-call/error.html' },
  inviteDialog: { app: home, mock: 'dialogs/invite/default.html' },
  inviteDialogCopied: { app: home, mock: 'dialogs/invite/copied.html' },
  photoAlbum: { app: photos, mock: 'pages/photo-album/default.html' },
  photoAlbumLoading: { app: photos, mock: 'pages/photo-album/loading.html' },
  photoAlbumEmpty: { app: photos, mock: 'pages/photo-album/empty.html' },
  photoAlbumError: { app: photos, mock: 'pages/photo-album/error.html' },
  photoAlbumMine: { app: photos, mock: 'pages/photo-album/mine.html' },
  photoAlbumNoResults: { app: photos, mock: 'pages/photo-album/no-results.html' },
  addPhotos: { app: photos, mock: 'dialogs/add-photos/default.html' },
  addPhotosInvalid: { app: photos, mock: 'dialogs/add-photos/invalid.html' },
  addPhotosBusy: { app: photos, mock: 'dialogs/add-photos/busy.html' },
  addPhotosFailed: { app: photos, mock: 'dialogs/add-photos/failed.html' },
  photoView: { app: photo, mock: 'pages/photo-view/default.html' },
  photoViewLoading: { app: photo, mock: 'pages/photo-view/loading.html' },
  photoViewError: { app: photo, mock: 'pages/photo-view/error.html' },
  experiences: { app: experiences, mock: 'pages/experiences/default.html' },
  experiencesLoading: { app: experiences, mock: 'pages/experiences/loading.html' },
  experiencesEmpty: { app: experiences, mock: 'pages/experiences/empty.html' },
  experiencesError: { app: experiences, mock: 'pages/experiences/error.html' },
  experiencesDid: { app: experiences, mock: 'pages/experiences/did.html' },
  experiencesWant: { app: experiences, mock: 'pages/experiences/want.html' },
  experiencesNoResults: { app: experiences, mock: 'pages/experiences/no-results.html' },
  shareExperience: { app: experiences, mock: 'dialogs/share-experience/default.html' },
  shareExperienceBusy: { app: experiences, mock: 'dialogs/share-experience/busy.html' },
  shareExperienceInvalid: { app: experiences, mock: 'dialogs/share-experience/invalid.html' },
  shareExperienceFailed: { app: experiences, mock: 'dialogs/share-experience/failed.html' },
  shareExperienceEdit: { app: experience, mock: 'dialogs/share-experience/edit.html' },
  experienceDetail: { app: experience, mock: 'pages/experience-detail/default.html' },
  experienceDetailOwn: { app: experience, mock: 'pages/experience-detail/own.html' },
  experienceDetailRated: { app: experience, mock: 'pages/experience-detail/rated.html' },
  experienceDetailWant: { app: idea, mock: 'pages/experience-detail/want.html' },
  experienceDetailWantKeen: { app: idea, mock: 'pages/experience-detail/want-keen.html' },
  experienceDetailWantOwn: { app: idea, mock: 'pages/experience-detail/want-own.html' },
  experienceDetailLoading: { app: experience, mock: 'pages/experience-detail/loading.html' },
  experienceDetailError: { app: experience, mock: 'pages/experience-detail/error.html' },
  experienceActions: { app: experience, mock: 'dialogs/experience-actions/default.html' },
  experienceActionsHost: { app: idea, mock: 'dialogs/experience-actions/host.html' },
  deleteExperience: { app: experience, mock: 'dialogs/delete-experience/default.html' },
  deleteExperienceBusy: { app: experience, mock: 'dialogs/delete-experience/busy.html' },
  deleteExperienceFailed: { app: experience, mock: 'dialogs/delete-experience/failed.html' },
  addComment: { app: experience, mock: 'dialogs/add-comment/default.html' },
  addCommentBusy: { app: experience, mock: 'dialogs/add-comment/busy.html' },
  addCommentInvalid: { app: experience, mock: 'dialogs/add-comment/invalid.html' },
  groupChat: { app: chat, mock: 'pages/group-chat/default.html' },
  groupChatLoading: { app: chat, mock: 'pages/group-chat/loading.html' },
  groupChatEmpty: { app: chat, mock: 'pages/group-chat/empty.html' },
  groupChatError: { app: chat, mock: 'pages/group-chat/error.html' },
  groupChatFailedSend: { app: chat, mock: 'pages/group-chat/failed-send.html' },
  groupChatOffline: { app: chat, mock: 'pages/group-chat/offline.html' },
  groupChatNewMessages: { app: chat, mock: 'pages/group-chat/new-messages.html' },
  groupChatUnread: { app: chat, mock: 'pages/popkin-home/default.html' },
  bannerDanger: { app: chat, mock: 'notifications/banner/danger.html' },
  bannerSuccess: { app: chat, mock: 'notifications/banner/success.html' },
  toastSuccess: { app: '/verify', mock: 'notifications/toast/success.html' },
  serverError: { app: '/error', mock: 'pages/server-error/default.html' },
  serverErrorWithReference: {
    app: `/p/${created.id}/created`,
    mock: 'pages/server-error/default.html',
  },
  notFound: { app: '/no-such-screen', mock: 'pages/not-found/default.html' },
  // Journey 9, Wrap up.
  // The Host's whole menu from journey 16, Change Popkin settings.
  popkinSettings: { app: home, mock: 'dialogs/popkin-settings/default.html' },
  popkinSettingsMember: { app: home, mock: 'dialogs/popkin-settings/member.html' },
  // Journey 16, Change Popkin settings.
  editPopkin: { app: home, mock: 'dialogs/edit-popkin/default.html' },
  editPopkinBusy: { app: home, mock: 'dialogs/edit-popkin/busy.html' },
  editPopkinInvalid: { app: home, mock: 'dialogs/edit-popkin/invalid.html' },
  editPopkinFailed: { app: home, mock: 'dialogs/edit-popkin/failed.html' },
  changeLength: { app: home, mock: 'dialogs/change-length/default.html' },
  changeLengthBusy: { app: home, mock: 'dialogs/change-length/busy.html' },
  changeLengthFailed: { app: home, mock: 'dialogs/change-length/failed.html' },
  leavePopkin: { app: home, mock: 'dialogs/leave-popkin/default.html' },
  leavePopkinBusy: { app: home, mock: 'dialogs/leave-popkin/busy.html' },
  leavePopkinFailed: { app: home, mock: 'dialogs/leave-popkin/failed.html' },
  wrapUp: { app: wrapUp, mock: 'pages/wrap-up/default.html' },
  wrapUpAlbumOff: { app: wrapUp, mock: 'pages/wrap-up/album-off.html' },
  wrapUpSubmitting: { app: wrapUp, mock: 'pages/wrap-up/submitting.html' },
  wrapUpError: { app: wrapUp, mock: 'pages/wrap-up/error.html' },
  recap: { app: recap, mock: 'pages/wrapped-up/default.html' },
  recapHost: { app: recap, mock: 'pages/wrapped-up/host.html' },
  recapLoading: { app: recap, mock: 'pages/wrapped-up/loading.html' },
  recapError: { app: recap, mock: 'pages/wrapped-up/error.html' },
  recapExporting: { app: recap, mock: 'pages/wrapped-up/exporting.html' },
  recapPlain: { app: recap, mock: 'pages/wrapped-up/plain.html' },
  // The album was not kept: the recap under the banner that counts the days.
  recapGoing: { app: recap, mock: 'notifications/banner/persistent.html' },
  popkinHomeLastHour: { app: home, mock: 'pages/popkin-home/last-hour.html' },
  popkinHomeLastHourMember: { app: home, mock: 'pages/popkin-home/last-hour-member.html' },
  groupChatReadOnly: { app: chat, mock: 'pages/group-chat/read-only.html' },
  photoAlbumWrapped: { app: photos, mock: 'pages/photo-album/wrapped.html' },
  photoAlbumGoing: { app: photos, mock: 'pages/photo-album/going.html' },
  photoAlbumRemoved: { app: photos, mock: 'pages/photo-album/removed.html' },
  experiencesWrapped: { app: experiences, mock: 'pages/experiences/wrapped.html' },
  experienceDetailWrapped: { app: experience, mock: 'pages/experience-detail/wrapped.html' },
  // Journey 11, Direct message.
  conversations: { app: conversations, mock: 'pages/conversations/default.html' },
  conversationsLoading: { app: conversations, mock: 'pages/conversations/loading.html' },
  conversationsEmpty: { app: conversations, mock: 'pages/conversations/empty.html' },
  conversationsError: { app: conversations, mock: 'pages/conversations/error.html' },
  newMessage: { app: conversations, mock: 'dialogs/new-message/default.html' },
  newMessageNoResults: { app: conversations, mock: 'dialogs/new-message/no-results.html' },
  directMessage: { app: directMessage, mock: 'pages/direct-message/default.html' },
  directMessageLoading: { app: directMessage, mock: 'pages/direct-message/loading.html' },
  directMessageEmpty: { app: directMessage, mock: 'pages/direct-message/empty.html' },
  directMessageError: { app: directMessage, mock: 'pages/direct-message/error.html' },
  directMessageReadOnly: { app: directMessage, mock: 'pages/direct-message/read-only.html' },
  directMessageCall: { app: directMessage, mock: 'pages/direct-message/call.html' },
  // Journey 12, React and reply: the dialogs open over the Everyone thread.
  reactions: { app: chat, mock: 'dialogs/reactions/default.html' },
  reactionsMine: { app: chat, mock: 'dialogs/reactions/mine.html' },
  reactionsMore: { app: chat, mock: 'dialogs/reactions/more.html' },
  deleteMessage: { app: chat, mock: 'dialogs/delete-message/default.html' },
  groupChatMarked: { app: chat, mock: 'pages/group-chat/marked.html' },
  groupChatDeletedQuote: { app: chat, mock: 'pages/group-chat/deleted-quote.html' },
  // Journey 13, Photos in chat: the photo preview and a refused photo in the composer, and the
  // photo view of a direct message's photo (an album photo until the app answers one).
  groupChatPhotoPreview: { app: chat, mock: 'pages/group-chat/photo-preview.html' },
  groupChatPhotoRefused: { app: chat, mock: 'pages/group-chat/photo-refused.html' },
  photoViewDirect: { app: photo, mock: 'pages/photo-view/direct.html' },
} satisfies Record<string, ScreenRoute>;

export type RouteKey = keyof typeof routes;
