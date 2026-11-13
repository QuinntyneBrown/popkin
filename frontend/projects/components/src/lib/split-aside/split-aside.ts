import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MarkPicture, MarkPictureView } from '../mark-picture/mark-picture';
import { PopkinTile } from '../popkin-tile/popkin-tile';

/**
 * Split aside (docs/design-system/components/split-aside.html): the picture half of a split
 * screen, a picture of what the step makes. It shows from 768 px; below that it is not
 * rendered at all, so it leaves the tab order and the accessibility tree (L2-058 AC10, AC13).
 * It repeats nothing a person needs to finish the step. Project it into pk-screen's
 * `[slot=aside]`.
 *
 * With `photo` it is a photograph under a caption (`heading` and `text`). Without one it is a
 * body: an `icon`, a `kicker`, a `heading`, the projected picture, then `text`. With `photos`
 * the body is a mosaic of them, the first one large, over the Popkin it is about (`tile`,
 * `name`, `line`): the recap that wrapping up will make. With `mark` the body is the mark as a
 * picture, on Popkin's own colour when the surface is `brand`: the welcome screen.
 */
@Component({
  selector: 'aside[pk-split-aside]',
  imports: [MarkPicture, PopkinTile],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './split-aside.html',
  styleUrl: './split-aside.scss',
  host: {
    class: 'split-aside',
    '[class.split-aside--tint]': "surface() === 'tint'",
    '[class.split-aside--brand]': "surface() === 'brand'",
    '[class.split-aside--muted]': 'muted()',
    '[attr.aria-label]': 'label()',
  },
})
export class SplitAside {
  /** Names the region for assistive technology, such as "Preview". */
  readonly label = input.required<string>();
  /** `tint` washes the aside in the Popkin's colour; `brand` in Popkin's own. */
  readonly surface = input<'subtle' | 'tint' | 'brand'>('subtle');
  /** The mark as a picture, as wide as the aside lets it be: the welcome screen. */
  readonly mark = input<MarkPictureView>();
  /** A photograph that fills the aside. It is decoration: the caption says what matters. */
  readonly photo = input<string>();
  /** Greys the photograph: the Popkin has wrapped up. The screen says so in words. */
  readonly muted = input(false);
  /** Photos as a mosaic, the first one large. Decoration. */
  readonly photos = input<readonly string[]>([]);
  /** The Popkin under the mosaic: its emoji on a tile, its `name` and a `line` about it. */
  readonly tile = input<string>();
  readonly name = input<string>();
  readonly line = input<string>();
  /** An emoji above the heading. */
  readonly icon = input<string>();
  /** A quiet line above the picture. */
  readonly kicker = input<string>();
  readonly heading = input<string>();
  readonly text = input<string>();
  /** `center` sets the body's content in the middle of the aside. */
  readonly justify = input<'start' | 'center'>('start');
}
