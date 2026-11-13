import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Screen and layout (docs/design-system/components/screen.html): the phone-width column every app
 * screen sits in. It owns the `main` landmark the skip link moves to, an optional heading and
 * lead, and the sticky footer that keeps the main action within reach of the thumb.
 */
@Component({
  selector: 'div[pk-screen]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './screen.html',
  styleUrl: './screen.scss',
  host: {
    class: 'screen',
    '[class.screen--wash]': "surface() === 'wash'",
    '[attr.data-accent]': 'accent()',
  },
})
export class Screen {
  /** The Popkin colour the screen carries; the app's own screens are Coral. */
  readonly accent = input<string>('coral');
  readonly surface = input<'canvas' | 'wash'>('canvas');
  /** The `h1` of the screen. Leave it out when the content brings its own. */
  readonly heading = input<string>();
  /** The muted line under the heading. */
  readonly lead = input<string>();
  /** `hero` centres the content of a celebration screen under a tall top. */
  readonly body = input<'default' | 'hero'>('default');
  /** Renders the sticky footer around the `[slot=footer]` content. */
  readonly footer = input(false);
}
