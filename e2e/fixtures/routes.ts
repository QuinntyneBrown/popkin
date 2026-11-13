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

export const routes = {
  home: { app: '/' },
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
  toastSuccess: { app: '/verify', mock: 'notifications/toast/success.html' },
  serverError: { app: '/error', mock: 'pages/server-error/default.html' },
  serverErrorWithReference: {
    app: `/p/${created.id}/created`,
    mock: 'pages/server-error/default.html',
  },
  notFound: { app: '/no-such-screen', mock: 'pages/not-found/default.html' },
} satisfies Record<string, ScreenRoute>;

export type RouteKey = keyof typeof routes;
