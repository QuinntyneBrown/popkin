import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Tile (docs/design-system/components/figures.html): one linked count in `pk-tiles`, such as
 * "4 Calls under way". The value and the label together name the link; a `note` adds a line.
 */
@Component({
  selector: 'a[pk-tile]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tile.html',
  styleUrl: './tile.scss',
  host: { class: 'tile' },
})
export class Tile {
  readonly value = input.required<string>();
  readonly label = input.required<string>();
  readonly note = input<string>();
}
