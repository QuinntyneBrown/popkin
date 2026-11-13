import { Routes } from '@angular/router';
import { signedInGuard } from './guards/signed-in.guard';

/**
 * Route data drives the shell: `shell` picks the chrome (`app` or `bare`) and `page` is stamped
 * on `<body data-page>`, the e2e anchor for every screen.
 */
export interface PkRouteData {
  shell: 'app' | 'bare';
  page: string;
}

const data = (value: PkRouteData): PkRouteData => value;

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage),
    data: data({ shell: 'bare', page: 'home' }),
    title: 'Popkin',
  },
  {
    path: 'sign-up',
    loadComponent: () => import('./pages/sign-up/sign-up.page').then((m) => m.SignUpPage),
    data: data({ shell: 'bare', page: 'sign-up' }),
    title: 'Sign up · Popkin',
  },
  {
    path: 'verify',
    loadComponent: () =>
      import('./pages/verify-code/verify-code.page').then((m) => m.VerifyCodePage),
    data: data({ shell: 'bare', page: 'verify-code' }),
    title: 'Enter your code · Popkin',
  },
  {
    path: 'new',
    canActivate: [signedInGuard],
    loadComponent: () =>
      import('./pages/name-your-popkin/name-your-popkin.page').then((m) => m.NameYourPopkinPage),
    data: data({ shell: 'bare', page: 'name-your-popkin' }),
    title: 'Name your Popkin · Popkin',
  },
  {
    path: 'new/length',
    canActivate: [signedInGuard],
    loadComponent: () => import('./pages/how-long/how-long.page').then((m) => m.HowLongPage),
    data: data({ shell: 'bare', page: 'how-long' }),
    title: 'How long should it last? · Popkin',
  },
  {
    path: 'p/:popkinId/created',
    canActivate: [signedInGuard],
    loadComponent: () =>
      import('./pages/popkin-created/popkin-created.page').then((m) => m.PopkinCreatedPage),
    data: data({ shell: 'bare', page: 'popkin-created' }),
    title: 'Your Popkin is up · Popkin',
  },
  {
    path: 'i/:code',
    loadComponent: () =>
      import('./pages/join-invite/join-invite.page').then((m) => m.JoinInvitePage),
    data: data({ shell: 'bare', page: 'join-invite' }),
    title: 'Your invite · Popkin',
  },
  {
    path: 'i/:code/profile',
    canActivate: [signedInGuard],
    loadComponent: () =>
      import('./pages/your-profile/your-profile.page').then((m) => m.YourProfilePage),
    data: data({ shell: 'bare', page: 'your-profile' }),
    title: 'How should people know you? · Popkin',
  },
  {
    path: 'i/:code/welcome',
    canActivate: [signedInGuard],
    loadComponent: () => import('./pages/youre-in/youre-in.page').then((m) => m.YoureInPage),
    data: data({ shell: 'bare', page: 'youre-in' }),
    title: 'You’re in · Popkin',
  },
  {
    path: 'p/:popkinId/chat/everyone',
    canActivate: [signedInGuard],
    loadComponent: () => import('./pages/group-chat/group-chat.page').then((m) => m.GroupChatPage),
    data: data({ shell: 'app', page: 'group-chat' }),
    title: 'Everyone · Popkin',
  },
  // Until the list of conversations is built (journey 11), Chat is the Everyone thread.
  { path: 'p/:popkinId/chat', redirectTo: 'p/:popkinId/chat/everyone', pathMatch: 'full' },
  {
    path: 'error',
    loadComponent: () =>
      import('./pages/server-error/server-error.page').then((m) => m.ServerErrorPage),
    data: data({ shell: 'bare', page: 'server-error' }),
    title: 'Something went wrong · Popkin',
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found.page').then((m) => m.NotFoundPage),
    data: data({ shell: 'bare', page: 'not-found' }),
    title: 'Page not found · Popkin',
  },
];
