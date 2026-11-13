import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The tiles of a call (docs/design-system/components/call-tile.html, `call-grid`): a labelled
 * list of `li[pk-call-tile]`, equal in size, that fills the room the screen gives it. `count`,
 * the number of tiles, picks the columns (L2-030 AC1): one tile fills the grid; two are one
 * above the other, and side by side from 640 px; three or four are in two columns; five and
 * more are in two columns, and three from 640 px.
 */
@Component({
  selector: 'ul[pk-call-grid]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './call-grid.html',
  styleUrl: './call-grid.scss',
  host: {
    class: 'call-grid',
    '[class.call-grid--solo]': 'count() <= 2',
    '[class.call-grid--pair]': 'count() === 2',
    '[class.call-grid--six]': 'count() >= 5',
    '[attr.aria-label]': 'label()',
  },
})
export class CallGrid {
  /** How many tiles the grid holds, the one that counts the rest among them. */
  readonly count = input.required<number>();
  /** The name of the list. */
  readonly label = input('On the call');
}
