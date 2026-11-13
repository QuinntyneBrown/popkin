import { ChangeDetectionStrategy, Component } from '@angular/core';

/** A link of the site footer (docs/design-system/components/site-navigation.html). */
@Component({
  selector: 'a[pk-site-footer-link]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site-footer-link.html',
  styleUrl: './site-footer-link.scss',
  host: { class: 'site-footer__link' },
})
export class SiteFooterLink {}
