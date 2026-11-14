import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Logo } from '../logo/logo';

/**
 * Site header (docs/design-system/components/site-navigation.html): the logo, which leads home,
 * and the navigation of the public landing page. Project its links (`a[pk-site-nav-link]`) and
 * its one action (a small primary `a[pk-button]`), in reading order. Their addresses are the
 * page's own: router links in the app, plain `href`s on the marketing site.
 */
@Component({
  selector: 'header[pk-site-nav]',
  imports: [Logo, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site-nav.html',
  styleUrl: './site-nav.scss',
  host: { class: 'container site-nav' },
})
export class SiteNav {
  /** Where the logo leads, a route of the app. */
  readonly home = input<string>('/');
  /**
   * Where the logo leads as a plain address, for a site with no router (the marketing site,
   * ADR 0017). Given, it replaces `home`.
   */
  readonly homeHref = input<string>();
  /** Names the navigation for assistive technology. */
  readonly label = input('Site');
}
