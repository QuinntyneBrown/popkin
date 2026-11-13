import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Screen } from 'components';

/** Wrap up (L2-043): the Host ends the Popkin on purpose, knowing what follows. */
@Component({
  selector: 'pk-wrap-up-page',
  imports: [Screen],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './wrap-up.page.html',
})
export class WrapUpPage {
  readonly popkinId = input.required<string>();
}
