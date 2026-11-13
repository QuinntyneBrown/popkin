import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconButton } from '../icon-button/icon-button';
import { PopkinTile } from '../popkin-tile/popkin-tile';
import { StepDots } from '../step-dots/step-dots';

/**
 * Top bar (docs/design-system/components/top-bar.html): Back on the start, the titles or the step
 * dots in the middle, actions on the end. With no Back it is the padded brand bar
 * (`topbar--pad`) that holds the logo, or, on a `div`, the head of a pane. A thread's bar has a
 * `line` under it, is `sticky`, and names the Popkin: its `tile`, its name as the `heading` (the
 * screen's `h1`) and a `sub` line. In a thread screen Back is absent from 1024 px, where the
 * list of threads is beside the thread.
 */
@Component({
  selector: 'header[pk-top-bar], div[pk-top-bar]',
  imports: [IconButton, PopkinTile, RouterLink, StepDots],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './top-bar.html',
  styleUrl: './top-bar.scss',
  host: {
    class: 'topbar',
    '[class.topbar--pad]': 'back() === undefined',
    '[class.topbar--line]': 'line()',
    '[class.topbar--sticky]': 'sticky()',
  },
})
export class TopBar {
  /** The route Back leads to. Without it the bar is the brand bar. */
  readonly back = input<string>();
  /** Step dots: the current step (from 1) and the number of steps. */
  readonly step = input<number>();
  readonly steps = input<number>();
  /** A hairline under the bar. */
  readonly line = input(false);
  /** Keeps the bar at the top of the screen while its content scrolls under it. */
  readonly sticky = input(false);
  /** The emoji of the Popkin, on a small tile before the heading. */
  readonly tile = input<string>();
  /** The title as the screen's `h1`. */
  readonly heading = input<string>();
  /** The muted line under the title: "14 members · 5 here now". */
  readonly sub = input<string>();
}
