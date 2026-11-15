import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Sparkline } from '../sparkline/sparkline';

/**
 * Sprint chip (docs/design-system/components/plan.html): the link from the plan board's header to
 * the burn-down. Its sparkline, then "24 pts left" in bold and "· 7 behind", "· 3 ahead" or
 * "· on track", which name the link (L2-068 AC7). Once nothing is left it says "All done" alone.
 * The page sets where it goes (`routerLink`).
 */
@Component({
  selector: 'a[pk-sprint-chip]',
  imports: [Sparkline],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sprint-chip.html',
  styleUrl: './sprint-chip.scss',
  host: { class: 'sprint-chip' },
})
export class SprintChip {
  /** "24 pts left" or "All done". */
  readonly headline = input.required<string>();
  /** "7 behind", "3 ahead" or "on track"; none once all is done. */
  readonly status = input<string | null>(null);
  readonly line = input.required<string>();
  readonly idealFrom = input.required<number>();
}
