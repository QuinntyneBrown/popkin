import { OfflinePage } from './pages/offline/offline.page';
import { Routes } from '@angular/router';
import { AlbumStore, ExperienceStore, ExperiencesStore, PopkinFrame } from 'api';
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
    path: 'sign-in',
    loadComponent: () => import('./pages/sign-in/sign-in.page').then((m) => m.SignInPage),
    data: data({ shell: 'bare', page: 'sign-in' }),
    title: 'Sign in · Popkin',
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
    path: 'p/:popkinId',
    pathMatch: 'full',
    canActivate: [signedInGuard],
    loadComponent: () =>
      import('./pages/popkin-home/popkin-home.page').then((m) => m.PopkinHomePage),
    data: data({ shell: 'app', page: 'popkin-home' }),
    title: 'Popkin home · Popkin',
  },
  {
    path: 'p/:popkinId/chat/everyone',
    canActivate: [signedInGuard],
    loadComponent: () => import('./pages/group-chat/group-chat.page').then((m) => m.GroupChatPage),
    data: data({ shell: 'app', page: 'group-chat' }),
    title: 'Everyone · Popkin',
  },
  {
    path: 'p/:popkinId/recap',
    canActivate: [signedInGuard],
    loadComponent: () => import('./pages/wrapped-up/wrapped-up.page').then((m) => m.WrappedUpPage),
    data: data({ shell: 'bare', page: 'wrapped-up' }),
    title: 'Recap · Popkin',
  },
  {
    path: 'p/:popkinId/call',
    canActivate: [signedInGuard],
    loadComponent: () => import('./pages/video-call/video-call.page').then((m) => m.VideoCallPage),
    data: data({ shell: 'bare', page: 'video-call' }),
    title: 'Group call · Popkin',
  },
  {
    path: 'p/:popkinId/experiences',
    canActivate: [signedInGuard],
    providers: [PopkinFrame],
    children: [
      {
        path: '',
        pathMatch: 'full',
        providers: [ExperiencesStore],
        loadComponent: () =>
          import('./pages/experiences/experiences.page').then((m) => m.ExperiencesPage),
        data: data({ shell: 'app', page: 'experiences' }),
        title: 'Experiences · Popkin',
      },
      {
        path: ':experienceId',
        providers: [ExperienceStore],
        loadComponent: () =>
          import('./pages/experience-detail/experience-detail.page').then(
            (m) => m.ExperienceDetailPage,
          ),
        data: data({ shell: 'app', page: 'experience-detail' }),
        title: 'Experience · Popkin',
      },
    ],
  },
  // The album and the photo open over it share one album, kept while a photo is open so that
  // closing it returns to the place the member left (L2-033 AC2).
  {
    path: 'p/:popkinId/photos',
    canActivate: [signedInGuard],
    providers: [AlbumStore, PopkinFrame],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./pages/photo-album/photo-album.page').then((m) => m.PhotoAlbumPage),
        data: data({ shell: 'app', page: 'photo-album' }),
        title: 'Photos · Popkin',
      },
      {
        path: ':photoId',
        loadComponent: () =>
          import('./pages/photo-view/photo-view.page').then((m) => m.PhotoViewPage),
        data: data({ shell: 'bare', page: 'photo-view' }),
        title: 'Photo · Popkin',
      },
    ],
  },
  // Until the list of conversations is built (journey 11), Chat is the Everyone thread.
  { path: 'p/:popkinId/chat', redirectTo: 'p/:popkinId/chat/everyone', pathMatch: 'full' },
  {
    path: 'popkins',
    canActivate: [signedInGuard],
    loadComponent: () => import('./pages/my-popkins/my-popkins.page').then((m) => m.MyPopkinsPage),
    data: data({ shell: 'bare', page: 'my-popkins' }),
    title: 'Your Popkins · Popkin',
  },
  {
    path: 'offline',
    // Part of the first download: a screen that cannot be fetched offline still has this one.
    component: OfflinePage,
    data: data({ shell: 'bare', page: 'offline' }),
    title: 'You’re offline · Popkin',
  },
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
