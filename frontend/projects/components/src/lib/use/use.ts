import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PopkinTile } from '../popkin-tile/popkin-tile';

/**
 * An idea card (docs/design-system/components/uses.html, `use`): one kind of group a Popkin is
 * for. A picture, the group's emoji on a tile in its colour beside its name, a sentence, and how
 * long such a Popkin lasts (L2-001 AC3). The picture and the tile are decoration; the name is
 * an `h3` and the colour is never the only thing that tells two cards apart.
 */
@Component({
  selector: 'article[pk-use]',
  imports: [PopkinTile],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './use.html',
  styleUrl: './use.scss',
  host: { class: 'use', '[attr.data-accent]': 'accent()' },
})
export class Use {
  /** The `data-accent` value of the idea's colour. */
  readonly accent = input.required<string>();
  readonly image = input.required<string>();
  readonly emoji = input.required<string>();
  /** The card's `h3`: "Small group". */
  readonly heading = input.required<string>();
  readonly text = input.required<string>();
  /** How long it lasts: "One weekend". */
  readonly length = input.required<string>();
}
