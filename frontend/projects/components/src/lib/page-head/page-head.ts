import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BackLink } from '../back-link/back-link';

/**
 * Page head (docs/design-system/components/page-head.html): a page's title, the line under it,
 * and its actions (`[slot=actions]`) at the end, which wrap below on a phone. `back` puts the
 * `page-head__back` link above the title, below M only with `backBelowM` (Connections' "Groups").
 */
@Component({
  selector: 'div[pk-page-head]',
  imports: [BackLink, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page-head.html',
  styleUrl: './page-head.scss',
  host: { class: 'page-head' },
})
export class PageHead {
  readonly heading = input.required<string>();
  readonly sub = input<string>();
  /** The back link's words: "Groups". */
  readonly back = input<string>();
  readonly backLink = input<string | readonly unknown[]>();
  readonly backBelowM = input(false);
}
