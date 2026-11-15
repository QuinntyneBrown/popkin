import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Sparkline (docs/design-system/components/plan.html): the points left over the sprint in a
 * 44 × 22 box, the line in the Popkin's colour against the dashed ideal (L2-068 AC7). Hidden from
 * assistive technology: the sprint chip's words say what it shows. `sparklineOf` in the `api`
 * library works out its path.
 */
@Component({
  selector: 'svg[pk-sparkline]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sparkline.html',
  styleUrl: './sparkline.scss',
  host: { class: 'sparkline', viewBox: '0 0 44 22', 'aria-hidden': 'true' },
})
export class Sparkline {
  /** The points left at the end of each day so far, as an SVG path. */
  readonly line = input.required<string>();
  /** Where the ideal line starts: the start points on the first day. */
  readonly idealFrom = input.required<number>();
}
