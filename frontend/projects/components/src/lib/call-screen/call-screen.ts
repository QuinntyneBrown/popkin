import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The screen of a call (docs/design-system/components/screen.html, `screen--stage`): the stage,
 * dark in both themes, as wide and as tall as the window. It owns the `main` landmark the skip
 * link moves to.
 *
 * `layout` says what `main` holds. `message` is one `pk-stage-message`: joining, or the call
 * could not start. `alone` is the member's own tile over "Waiting for the others", in two equal
 * parts (`screen--alone`). `call` is the tiles of a call with others on it (`screen--call`):
 * from 640 px its bar is taller and its tiles sit further apart, and from 1280 px the screen
 * leaves room at its end for the pane that lists who is on the call (L2-058 AC12).
 *
 * Slots: `[slot=header]` (a `pk-top-bar`), the default slot inside `main` (a `pk-call-grid`, a
 * `pk-stage-message`), `[slot=controls]` (the `pk-call-controls`, kept at the bottom) and
 * `[slot=aside]` (the `pk-call-aside`).
 */
@Component({
  selector: 'div[pk-call-screen]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './call-screen.html',
  styleUrl: './call-screen.scss',
  host: {
    class: 'screen screen--stage',
    '[class.screen--call]': "layout() === 'call'",
    '[class.screen--alone]': "layout() === 'alone'",
    '[attr.data-accent]': 'accent()',
  },
})
export class CallScreen {
  /** The colour of the Popkin: the ring of who is speaking, and Leave. */
  readonly accent = input<string>();
  readonly layout = input<'message' | 'alone' | 'call'>('message');
}
