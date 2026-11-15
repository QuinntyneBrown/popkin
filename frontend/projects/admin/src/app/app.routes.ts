import { Routes } from '@angular/router';
import { adminSessionGuard } from './guards/admin-session.guard';
import { signedOutAdminGuard } from './guards/signed-out-admin.guard';

/**
 * Route data drives the shell: `shell` picks the chrome (`admin`, the console's frame, or `bare`)
 * and `page` (the mock manifest's id) is stamped on `<body data-page>`, the e2e anchor.
 */
export interface AdminRouteData {
  shell: 'admin' | 'bare';
  page: string;
}

const data = (value: AdminRouteData): AdminRouteData => value;

export const routes: Routes = [
  {
    path: 'sign-in',
    canActivate: [signedOutAdminGuard],
    loadComponent: () => import('./pages/sign-in/sign-in.page').then((m) => m.SignInPage),
    data: data({ shell: 'bare', page: 'sign-in' }),
    title: 'Sign in · Popkin Admin',
  },
  {
    path: 'not-an-admin',
    canActivate: [signedOutAdminGuard],
    loadComponent: () =>
      import('./pages/not-an-admin/not-an-admin.page').then((m) => m.NotAnAdminPage),
    data: data({ shell: 'bare', page: 'not-an-admin' }),
    title: 'Not an admin · Popkin Admin',
  },
  // The dashboard comes with the Overview (journey 25); until then the console opens on its log.
  { path: '', pathMatch: 'full', redirectTo: 'audit' },
  {
    path: '',
    canActivateChild: [adminSessionGuard],
    children: [
      {
        path: 'audit',
        loadComponent: () => import('./pages/audit/audit.page').then((m) => m.AuditPage),
        data: data({ shell: 'admin', page: 'audit' }),
        title: 'Audit log · Popkin Admin',
      },
    ],
  },
];
