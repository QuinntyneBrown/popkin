import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { PkRouteData } from './app.routes';

/** AppShell: the routed page in `main`, with the route's `page` stamped on `<body data-page>`. */
@Component({
  selector: 'pk-root',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);

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
  }
}
