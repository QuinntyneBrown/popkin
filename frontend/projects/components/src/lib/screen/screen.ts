import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Screen and layout (docs/design-system/components/screen.html): the frame of every app screen.
 * It fills the width it is given. It owns the `main` landmark the skip link moves to, an optional
 * heading and lead, and the sticky footer that keeps the main action within reach of the thumb.
 * A `split` screen keeps its form in a readable column and, from 768 px, shows the
 * `[slot=aside]` picture (pk-split-aside) beside it (L2-058 AC3, AC10).
 */
@Component({
  selector: 'div[pk-screen]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './screen.html',
  styleUrl: './screen.scss',
  host: {
    class: 'screen',
    '[class.screen--wash]': "surface() === 'wash'",
    '[class.screen--split]': "layout() === 'split'",
    '[class.screen--middle]': 'middle()',
    '[attr.data-accent]': 'accent()',
  },
})
export class Screen {
  /** The Popkin colour the screen carries; the app's own screens are Coral. */
  readonly accent = input<string>('coral');
  readonly surface = input<'canvas' | 'wash'>('canvas');
  /** `split` is a step screen: a form column, and from 768 px a picture beside it. */
  readonly layout = input<'fill' | 'split'>('fill');
  /** From 768 px, sets the body and its footer together in the middle (a celebration). */
  readonly middle = input(false);
  /** The `h1` of the screen. Leave it out when the content brings its own. */
  readonly heading = input<string>();
  /** The muted line under the heading. */
  readonly lead = input<string>();
  /**
   * `hero` centres the content of a celebration screen under a tall top; `middle` sets a short
   * form in the middle of its part from 768 px; `invite` leaves room above an invite.
   */
  readonly body = input<'default' | 'hero' | 'middle' | 'invite'>('default');
  /** From 768 px, keeps the one action of a centred split screen no wider than a button. */
  readonly loneAction = input(false);
  /** Renders the sticky footer around the `[slot=footer]` content. */
  readonly footer = input(false);
}
