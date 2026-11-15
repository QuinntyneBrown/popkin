import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Tiles (docs/design-system/components/figures.html): linked counts under the figures on
 * Dashboard, each a `pk-tile` that opens the list it counts. Two across; `wide` puts four across
 * from 1024 px. They close the bottom of the panel they sit in.
 */
@Component({
  selector: 'div[pk-tiles]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tiles.html',
  styleUrl: './tiles.scss',
  host: { class: 'tiles', '[class.tiles--4]': 'wide()' },
})
export class Tiles {
  readonly wide = input(false);
}
