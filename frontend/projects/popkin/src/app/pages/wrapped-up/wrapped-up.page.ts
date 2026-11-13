import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Screen } from 'components';

/** The recap of a wrapped-up Popkin (L2-046): its front page once it has ended. */
@Component({
  selector: 'pk-wrapped-up-page',
  imports: [Screen],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './wrapped-up.page.html',
})
export class WrappedUpPage {
  readonly popkinId = input.required<string>();
}
