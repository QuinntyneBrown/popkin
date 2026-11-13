import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The `main` landmark of the landing page (docs/design-system/components/site-navigation.html),
 * between the site header and the site footer. The skip link moves focus to it (L2-057 AC8).
 */
@Component({
  selector: 'main[pk-site-main]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site-main.html',
  styleUrl: './site-main.scss',
  host: { class: 'site-main', id: 'main', tabindex: '-1' },
})
export class SiteMain {}
