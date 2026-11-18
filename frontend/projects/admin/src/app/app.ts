import { Dialog } from '@angular/cdk/dialog';
import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { ADMIN_SECTIONS, AdminSessionStore, AdminWaitingStore, Toaster, VIEWER_NOTICE } from 'api';
import { AdminNavSection, AdminShell, SkipLink, Toast, ToastRegion } from 'components';
import { filter, map } from 'rxjs';
import { environment } from '../environments/environment';
import { AdminRouteData } from './app.routes';
import { MenuData, MenuDialog } from './dialogs/menu/menu.dialog';

/**
 * The admin app's root: the skip link, and the routed page, inside the console's frame for
 * `shell: 'admin'` or alone for `bare`, with the route's `page` stamped on `<body data-page>`.
 */
@Component({
  selector: 'pk-root',
  imports: [AdminShell, RouterOutlet, SkipLink, Toast, ToastRegion],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);
  private readonly session = inject(AdminSessionStore);
  protected readonly toaster = inject(Toaster);
  private readonly dialog = inject(Dialog);

  private readonly waiting = inject(AdminWaitingStore);

  /** The sections, with what waits beside each that counts it (L2-196 AC1). */
  protected readonly sections = computed<readonly AdminNavSection[]>(() => {
    const waiting = this.waiting.waiting();
    return ADMIN_SECTIONS.map((group) => ({
      label: group.label,
      items: group.items.map((item) => {
        const n = item.waiting && waiting ? waiting[item.waiting] : 0;
        return {
          label: item.label,
          route: item.route,
          page: item.page,
          icon: item.icon,
          waiting: n,
          waitingLabel: n && item.waitingLabel ? item.waitingLabel(n) : undefined,
        };
      }),
    }));
  });
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
    // The counts are read once a page of the console shows, never on sign-in.
    effect(() => {
      if (this.routeData()?.shell === 'admin') this.waiting.start();
    });
  }

  /** The sections in a drawer below 1024 px; focus returns to "Open menu" (L2-089 AC2). */
  protected openMenu(): void {
    const ref = this.dialog.open<'signOut', MenuData>(MenuDialog, {
      data: {
        sections: this.sections(),
        current: this.routeData()?.page,
        me: this.me(),
        label: this.label,
      },
      ariaLabel: 'Menu',
      // pk-admin-drawer draws its own backdrop.
      hasBackdrop: false,
      ariaModal: true,
    });
    ref.closed.subscribe((result) => {
      if (result === 'signOut') this.signOut();
    });
  }

  protected signOut(): void {
    void this.session.signOut().then(() => this.router.navigateByUrl('/sign-in'));
  }
}
