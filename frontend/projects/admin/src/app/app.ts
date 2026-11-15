import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { ADMIN_SECTIONS, AdminSessionStore } from 'api';
import { AdminShell, SkipLink } from 'components';
import { filter, map } from 'rxjs';
import { environment } from '../environments/environment';
import { AdminRouteData } from './app.routes';

/** The Viewer's notice above every page (L2-086 AC3). */
const VIEWER_NOTICE =
  'You’re signed in as a Viewer. You can look at everything; actions are switched off.';

/**
 * The admin app's root: the skip link, and the routed page, inside the console's frame for
 * `shell: 'admin'` or alone for `bare`, with the route's `page` stamped on `<body data-page>`.
 */
@Component({
  selector: 'pk-root',
  imports: [AdminShell, RouterOutlet, SkipLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);
  private readonly session = inject(AdminSessionStore);

  protected readonly sections = ADMIN_SECTIONS;
  protected readonly label = environment.consoleLabel;

  protected readonly routeData = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => {
        let route = this.route;
        while (route.firstChild) route = route.firstChild;
        return route.snapshot.data as Partial<AdminRouteData>;
      }),
    ),
  );

  protected readonly me = computed(() => {
    const me = this.session.me();
    return me ? { name: me.name, role: me.role } : null;
  });

  protected readonly notice = computed(() =>
    this.session.me()?.role === 'Viewer' ? VIEWER_NOTICE : null,
  );

  constructor() {
    effect(() => {
      const page = this.routeData()?.page;
      if (page) this.document.body.dataset['page'] = page;
    });
  }

  protected signOut(): void {
    void this.session.signOut().then(() => this.router.navigateByUrl('/sign-in'));
  }
}
