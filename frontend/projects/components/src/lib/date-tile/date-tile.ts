import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Date tile (docs/design-system/components/spotlight.html): a day as a small calendar leaf, its
 * month or weekday (`top`: "Sat") over its date (`day`: "19"). `soon` is a day this week, in the
 * loud yellow; `bare` drops the leaf, as in the rows of Coming up. Its row says the date in words.
 */
@Component({
  selector: 'span[pk-date-tile]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './date-tile.html',
  styleUrl: './date-tile.scss',
  host: {
    class: 'date-tile',
    '[class.date-tile--soon]': 'soon()',
    '[class.date-tile--bare]': 'bare()',
  },
})
export class DateTile {
  readonly top = input.required<string>();
  readonly day = input.required<string>();
  readonly soon = input(false);
  readonly bare = input(false);
}
