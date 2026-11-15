import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Headline figure (docs/design-system/components/figures.html): the one number over a chart on
 * Metrics, such as "10,314 a day on average", with its label as the chart's heading. A note at the
 * other end, such as the peak, is its content. `bad` draws a figure that is off target in the
 * danger colour; the words beside it say so too.
 */
@Component({
  selector: 'div[pk-headline-figure]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './headline-figure.html',
  styleUrl: './headline-figure.scss',
  host: { class: 'headline-figure' },
})
export class HeadlineFigure {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  /** What the value counts, such as "a day on average". */
  readonly unit = input<string>();
  readonly bad = input(false);
}
