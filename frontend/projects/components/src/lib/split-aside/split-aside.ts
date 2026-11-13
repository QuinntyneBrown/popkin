import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Split aside (docs/design-system/components/split-aside.html): the picture half of a split
 * screen, a picture of what the step makes. It shows from 768 px; below that it is not
 * rendered at all, so it leaves the tab order and the accessibility tree (L2-058 AC10, AC13).
 * It repeats nothing a person needs to finish the step. Project it into pk-screen's
 * `[slot=aside]`.
 *
 * With `photo` it is a photograph under a caption (`heading` and `text`). Without one it is a
 * body: an `icon`, a `kicker`, a `heading`, the projected picture, then `text`.
 */
@Component({
  selector: 'aside[pk-split-aside]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './split-aside.html',
  styleUrl: './split-aside.scss',
  host: {
    class: 'split-aside',
    '[class.split-aside--tint]': "surface() === 'tint'",
    '[attr.aria-label]': 'label()',
  },
})
export class SplitAside {
  /** Names the region for assistive technology, such as "Preview". */
  readonly label = input.required<string>();
  /** `tint` washes the aside in the Popkin's colour. */
  readonly surface = input<'subtle' | 'tint'>('subtle');
  /** A photograph that fills the aside. It is decoration: the caption says what matters. */
  readonly photo = input<string>();
  /** An emoji above the heading. */
  readonly icon = input<string>();
  /** A quiet line above the picture. */
  readonly kicker = input<string>();
  readonly heading = input<string>();
  readonly text = input<string>();
  /** `center` sets the body's content in the middle of the aside. */
  readonly align = input<'start' | 'center'>('start');
}
