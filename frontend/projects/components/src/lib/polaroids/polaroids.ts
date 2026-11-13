import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PopkinTile } from '../popkin-tile/popkin-tile';

/**
 * Polaroids (docs/design-system/components/recap.html, `polaroids`): the recap's collage, up to
 * three of the Popkin's photos as tilted prints with its emoji over their lower edge. The
 * prints are larger from 1024 px. With no photo the emoji stands alone, larger
 * (`polaroids--empty`). It is decoration: the photos are in the album. Set `data-accent` on an
 * ancestor.
 */
@Component({
  selector: 'div[pk-polaroids]',
  imports: [PopkinTile],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './polaroids.html',
  styleUrl: './polaroids.scss',
  host: {
    class: 'polaroids',
    '[class.polaroids--empty]': '!prints().length',
    'aria-hidden': 'true',
  },
})
export class Polaroids {
  /** The photos, in the order left, right, middle; the first three are shown. */
  readonly photos = input<readonly string[]>([]);
  readonly emoji = input.required<string>();

  protected readonly prints = computed(() => this.photos().slice(0, 3));
}
