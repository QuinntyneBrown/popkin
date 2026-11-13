import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconButton } from '../icon-button/icon-button';
import { StepDots } from '../step-dots/step-dots';

/**
 * Top bar (docs/design-system/components/top-bar.html): Back on the start, the titles or the step
 * dots in the middle, actions on the end. With no Back it is the padded brand bar
 * (`topbar--pad`) that holds the logo.
 */
@Component({
  selector: 'header[pk-top-bar]',
  imports: [IconButton, RouterLink, StepDots],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './top-bar.html',
  styleUrl: './top-bar.scss',
  host: {
    class: 'topbar',
    '[class.topbar--pad]': 'back() === undefined',
  },
})
export class TopBar {
  /** The route Back leads to. Without it the bar is the brand bar. */
  readonly back = input<string>();
  /** Step dots: the current step (from 1) and the number of steps. */
  readonly step = input<number>();
  readonly steps = input<number>();
}
