import { Routes } from '@angular/router';

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
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found.page').then((m) => m.NotFoundPage),
    data: data({ shell: 'bare', page: 'not-found' }),
    title: 'Page not found · Popkin',
  },
];
