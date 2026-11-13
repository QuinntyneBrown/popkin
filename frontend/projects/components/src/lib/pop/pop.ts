import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PopkinTile } from '../popkin-tile/popkin-tile';

const DOTS = Array.from({ length: 12 }, (_, i) => {
  const radius = i % 2 === 0 ? 4.4 : 3.52;
  const angle = (i * Math.PI) / 6;
  return `${(radius * Math.cos(angle)).toFixed(2)}rem ${(radius * Math.sin(angle)).toFixed(2)}rem`;
});

/**
 * The celebration on the created screen: the Popkin's tile springs in and twelve confetti dots
 * burst once, over the screen's heading. Under reduced motion the dots never show (L2-010 AC7, L2-060 AC1).
 */
@Component({
  selector: 'div[pk-pop]',
  imports: [PopkinTile],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pop.html',
  styleUrl: './pop.scss',
})
export class Pop {
  readonly emoji = input.required<string>();
  /** The screen's `h1`, under the tile. */
  readonly heading = input.required<string>();
  readonly lead = input<string>();
  protected readonly dots = DOTS;
}
