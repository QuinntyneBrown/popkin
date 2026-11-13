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

export const routes = {
  home: { app: '/' },
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
  videoCallTwo: { app: call, mock: 'pages/video-call/two.html' },
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
} satisfies Record<string, ScreenRoute>;

export type RouteKey = keyof typeof routes;
