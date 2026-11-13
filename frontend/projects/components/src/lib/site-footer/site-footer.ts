import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Logo } from '../logo/logo';

/**
 * Site footer (docs/design-system/components/site-navigation.html): the logo over a line about
 * Popkin, the footer's links (`a[pk-site-footer-link]`, projected) and the legal line. It carries
 * "Sign in" at every width, which is where a phone finds it (L2-002 AC4).
 */
@Component({
  selector: 'footer[pk-site-footer]',
  imports: [Logo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site-footer.html',
  styleUrl: './site-footer.scss',
  host: { class: 'site-footer' },
})
export class SiteFooter {
  /** The line under the logo. */
  readonly blurb = input.required<string>();
  /** The legal line: "© 2026 Popkin". */
  readonly legal = input.required<string>();
  /** Names the navigation for assistive technology. */
  readonly label = input('Footer');
}
