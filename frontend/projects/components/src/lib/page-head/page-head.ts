import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Page head (docs/design-system/components/page-head.html): a console page's title, the line
 * under it, and its actions (`[slot=actions]`) at the end, which wrap below on a phone.
 */
@Component({
  selector: 'div[pk-page-head]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page-head.html',
  styleUrl: './page-head.scss',
  host: { class: 'page-head' },
})
export class PageHead {
  readonly heading = input.required<string>();
  readonly sub = input<string>();
}
