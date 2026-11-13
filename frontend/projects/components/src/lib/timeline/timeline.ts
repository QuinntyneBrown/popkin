import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Timeline (docs/design-system/components/timeline.html): how long a Popkin lasts, in the aside
 * of How long. The bar is decoration; the two ends say the same in words. It takes the Popkin's
 * colour from `data-accent` on an ancestor.
 */
@Component({
  selector: 'div[pk-timeline]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './timeline.html',
  styleUrl: './timeline.scss',
  host: { class: 'timeline' },
})
export class Timeline {
  /** How much of the bar is filled: a day, a weekend, up to a chosen date, or with no end. */
  readonly span = input.required<'day' | 'weekend' | 'custom' | 'forever'>();
  readonly start = input.required<string>();
  /** When it wraps up, in words. */
  readonly end = input.required<string>();
}
