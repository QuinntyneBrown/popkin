import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * A link of the site header (docs/design-system/components/site-navigation.html). A phone has no
 * room for it: it shows from 640 px (`from="s"`, "Sign in", which the footer also carries) or
 * from 768 px (`from="m"`, the links to a section). Below that it is not rendered at all, so it
 * leaves the tab order and the accessibility tree (L2-002 AC4, L2-058 AC13).
 */
@Component({
  selector: 'a[pk-site-nav-link]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site-nav-link.html',
  styleUrl: './site-nav-link.scss',
  host: {
    class: 'site-nav__link',
    '[class.only-sm]': "from() === 's'",
    '[class.only-md]': "from() === 'm'",
  },
})
export class SiteNavLink {
  /** The form factor the link shows from: `s` is 640 px, `m` is 768 px. */
  readonly from = input<'s' | 'm'>('m');
}
