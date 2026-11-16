import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * Back link (docs/design-system/components/page-head.html, `page-head__back`): a chevron and the
 * name of the list it returns to ("People"), alone on its line above a page's heading or beside
 * its actions. Its words are its name; at least 32 px tall, a pill on hover.
 */
@Component({
  selector: 'a[pk-back-link]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './back-link.html',
  styleUrl: './back-link.scss',
  host: { class: 'page-head__back' },
})
export class BackLink {}
