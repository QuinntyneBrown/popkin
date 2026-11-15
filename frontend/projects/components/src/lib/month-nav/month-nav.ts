import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from '../button/button';
import { IconButton } from '../icon-button/icon-button';

/**
 * Month nav (docs/design-system/components/schedule.html#month-nav): the month of the chosen
 * week between "Previous month" and "Next month", its year, and, while another week is chosen,
 * a way back to the event's (L2-072 AC3, AC7). Each step is a link that sets `?week=` on `link`,
 * so the browser's Back undoes it.
 */
@Component({
  selector: 'div[pk-month-nav]',
  imports: [Button, IconButton, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './month-nav.html',
  styleUrl: './month-nav.scss',
  host: { class: 'month-nav' },
})
export class MonthNav {
  /** The view the steps open, such as `/p/{id}/schedule`. */
  readonly link = input.required<string>();
  /** "February". */
  readonly month = input.required<string>();
  /** "2027". */
  readonly year = input.required<string>();
  /** The first week of the month before and after, as `YYYY-MM-DD`. */
  readonly previous = input.required<string>();
  readonly next = input.required<string>();
  /** "Go to Cabin week" and the event's week; null hides it. */
  readonly goTo = input<{ label: string; week: string } | null>(null);
}
