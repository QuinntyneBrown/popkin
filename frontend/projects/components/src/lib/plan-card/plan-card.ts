import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { BiggestRows, BiggestStory } from '../biggest-rows/biggest-rows';

/**
 * The home's Plan card (docs/design-system/components/plan.html, `.card.biggest`): "24 pts left"
 * and "7 behind" in the Popkin's colour, then the three biggest open stories as a list named
 * "Biggest open" (L2-075 AC1). It is set in from the sides of its section.
 */
@Component({
  selector: 'div[pk-plan-card]',
  imports: [BiggestRows],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './plan-card.html',
  styleUrl: './plan-card.scss',
  host: { class: 'card biggest' },
})
export class PlanCard {
  /** "24 pts left" or "All done". */
  readonly headline = input.required<string>();
  /** "7 behind", "3 ahead" or "On track"; none once all is done. */
  readonly status = input<string | null>(null);
  readonly stories = input.required<BiggestStory[]>();
}
