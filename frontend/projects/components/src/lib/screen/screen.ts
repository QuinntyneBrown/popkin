import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PopkinTile } from '../popkin-tile/popkin-tile';

/**
 * Screen and layout (docs/design-system/components/screen.html): the frame of every app screen.
 * It fills the width it is given. It owns the `main` landmark the skip link moves to, an optional
 * heading and lead, and the sticky footer that keeps the main action within reach of the thumb.
 * A `split` screen keeps its form in a readable column and, from 768 px, shows the
 * `[slot=aside]` picture (pk-split-aside) beside it (L2-058 AC3, AC10).
 *
 * With a `tile` the screen is about one Popkin: its emoji on a tile above the heading (the
 * wrap-up screen). `[slot=notice]` is what went wrong, between the lead and the content.
 * `body="recap"` is the body of the recap (pk-recap).
 */
@Component({
  selector: 'div[pk-screen]',
  imports: [PopkinTile],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './screen.html',
  styleUrl: './screen.scss',
  host: {
    class: 'screen',
    '[class.screen--wash]': "surface() === 'wash'",
    '[class.screen--split]': "layout() === 'split'",
    '[class.screen--column]': "layout() === 'column'",
    '[class.screen--arrival]': "layout() === 'arrival'",
    '[class.screen--middle]': 'middle()',
    '[attr.data-accent]': 'accent()',
  },
})
export class Screen {
  /** The Popkin colour the screen carries; the app's own screens are Coral. */
  readonly accent = input<string>('coral');
  readonly surface = input<'canvas' | 'wash'>('canvas');
  /**
   * `split` is a step screen: a form column, and from 768 px a picture beside it. `arrival` is
   * a welcome: its content in the middle, its actions under it, side by side from 640 px.
   * `column` keeps one readable column in the middle at every width, with no picture (the
   * account).
   */
  readonly layout = input<'fill' | 'split' | 'arrival' | 'column'>('fill');
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
  readonly body = input<'default' | 'hero' | 'middle' | 'invite' | 'recap'>('default');
  /** The Popkin's emoji on a tile above the heading: the screen is about that Popkin. The
   * body then starts right under the top bar. */
  readonly tile = input<string>();
  /** From 768 px, keeps the one action of a centred split screen no wider than a button. */
  readonly loneAction = input(false);
  /** Renders the sticky footer around the `[slot=footer]` content. */
  readonly footer = input(false);
}
