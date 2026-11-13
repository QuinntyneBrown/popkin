import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, Injector, effect, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { WrapUpWatch } from 'api';
import { SkipLink, Toast, ToastRegion } from 'components';
import { filter, map } from 'rxjs';
import { PkRouteData } from './app.routes';
import { Toaster } from './toasts/toaster';

/** AppShell: the skip link and the routed page (which owns `main`), with the route's `page` stamped on `<body data-page>`. */
@Component({
  selector: 'pk-root',
  imports: [RouterOutlet, SkipLink, Toast, ToastRegion],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
})
export class App {
  protected readonly toaster = inject(Toaster);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  private readonly routeData = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => {
        let route = this.route;
        while (route.firstChild) route = route.firstChild;
        return route.snapshot.data as Partial<PkRouteData>;
      }),
    ),
  );

  constructor() {
    effect(() => {
      const page = this.routeData()?.page;
      if (page) this.document.body.dataset['page'] = page;
    });
    // L2-044 AC4: a Popkin that wraps up while one of its screens is open shows its recap.
    inject(WrapUpWatch)
      .wrappedUp$.pipe(takeUntilDestroyed())
      .subscribe((popkinId) => {
        const inside = `/p/${popkinId}`;
        const path = this.router.url.split(/[?#]/)[0];
        if (path !== inside && !path.startsWith(`${inside}/`)) return;
        if (path === `${inside}/recap`) return;
        // Loaded when needed: dialogs are no part of the first download.
        void import('@angular/cdk/dialog').then((cdk) => this.injector.get(cdk.Dialog).closeAll());
        void this.router.navigate(['/p', popkinId, 'recap'], { replaceUrl: true });
      });
  }
}
