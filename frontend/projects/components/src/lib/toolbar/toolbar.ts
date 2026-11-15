import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Toolbar (docs/design-system/components/toolbar.html): the search and the filters above a list,
 * on one line that wraps on a phone. It is the page's search landmark.
 */
@Component({
  selector: 'div[pk-toolbar]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './toolbar.html',
  styleUrl: './toolbar.scss',
  host: { class: 'toolbar', role: 'search' },
})
export class Toolbar {}
