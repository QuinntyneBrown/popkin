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
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found.page').then((m) => m.NotFoundPage),
    data: data({ shell: 'bare', page: 'not-found' }),
    title: 'Page not found · Popkin',
  },
];
