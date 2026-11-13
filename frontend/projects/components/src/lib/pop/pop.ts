import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PopkinTile } from '../popkin-tile/popkin-tile';

/** Twelve dots on two rings, the outer `reach` rem from the centre. */
function dots(reach: number): string[] {
  return Array.from({ length: 12 }, (_, i) => {
    const radius = i % 2 === 0 ? reach : reach * 0.8;
    const angle = (i * Math.PI) / 6;
    return `${(radius * Math.cos(angle)).toFixed(2)}rem ${(radius * Math.sin(angle)).toFixed(2)}rem`;
  });
}

const DOTS = dots(4.4);
const COMPACT_DOTS = dots(3.5);

/**
 * The celebration on the created screen: the Popkin's tile springs in and twelve confetti dots
 * burst once, over the screen's heading. Under reduced motion the dots never show (L2-010 AC7,
 * L2-060 AC1). `compact` is the burst alone, drawn closer, for the middle of a circle of people.
 */
@Component({
  selector: 'div[pk-pop]',
  imports: [PopkinTile],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pop.html',
  styleUrl: './pop.scss',
  host: { '[class.pop-compact]': 'compact()' },
})
export class Pop {
  readonly emoji = input.required<string>();
  /** The screen's `h1`, under the tile. Leave it out where the heading is drawn elsewhere. */
  readonly heading = input<string>();
  readonly lead = input<string>();
  readonly compact = input(false);
  protected readonly dots = computed(() => (this.compact() ? COMPACT_DOTS : DOTS));
}
