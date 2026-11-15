import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/**
 * Report item (docs/design-system/components/report-review.html): one report in the queue on
 * Reports, a link to its evidence. It shows the reason, what was reported and where, and how long
 * ago; a count of reports goes in `[slot=count]` as a status pill. `current` marks the open report
 * (`aria-current`), drawn as a bar as well as a fill so colour is not the only sign.
 */
@Component({
  selector: 'a[pk-report-item]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './report-item.html',
  styleUrl: './report-item.scss',
  host: { class: 'report-item', '[attr.aria-current]': "current() ? 'true' : null" },
})
export class ReportItem {
  /** The kind of thing reported: `message`, `sparkle` (an experience) or `image` (a photo). */
  readonly icon = input.required<IconName>();
  readonly reason = input.required<string>();
  /** What and where, such as "Message in Class of 2015 Reunion". */
  readonly where = input.required<string>();
  /** How long ago, such as "18 min ago". */
  readonly when = input.required<string>();
  readonly current = input(false);
}
