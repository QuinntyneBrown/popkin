import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Logo } from '../logo/logo';

/**
 * Site header (docs/design-system/components/site-navigation.html): the logo, which leads home,
 * and the navigation of the public landing page. Project its links (`a[pk-site-nav-link]`) and
 * its one action (a small primary `a[pk-button]`), in reading order.
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
  /** Where the logo leads. */
  readonly home = input<string>('/');
  /** Names the navigation for assistive technology. */
  readonly label = input('Site');
}
