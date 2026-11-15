import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Skeleton } from '../skeleton/skeleton';

/**
 * Burn (docs/design-system/components/plan.html): the burn-down's body (L2-071). The headline
 * ("24 pts left" or "All done") with its badge ("7 behind"), the forecast, then the chart; and
 * "Biggest open" under them, or beside them from 1024 px (AC7).
 *
 * While `loading` it draws skeletons of the same shape, with a status line for assistive
 * technology.
 *
 * Slots: `chart` holds the `pk-burn-chart`, `aside` the `pk-biggest-open`.
 */
@Component({
  selector: 'div[pk-burn]',
  imports: [Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './burn.html',
  styleUrl: './burn.scss',
  host: { class: 'burn' },
})
export class Burn {
  readonly headline = input('');
  /** "7 behind", "3 ahead" or "On track"; none once all is done. */
  readonly badge = input<string | null>(null);
  readonly forecast = input<string | null>(null);
  readonly loading = input(false);
}
