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
];
