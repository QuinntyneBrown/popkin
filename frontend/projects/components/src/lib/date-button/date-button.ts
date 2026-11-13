import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/**
 * A wide button that reads as a field (the mocks' `date-btn`): it shows a value, or what to
 * add, and opens what sets it. On How long it shows the end date and opens the date dialog; in
 * `pk-picture-field` it is "Add a picture" and opens the device's picker, with `popup` null.
 */
@Component({
  selector: 'button[pk-date-button]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './date-button.html',
  styleUrl: './date-button.scss',
  host: { class: 'date-btn', type: 'button', '[attr.aria-haspopup]': 'popup()' },
})
export class DateButton {
  readonly icon = input<IconName>('calendar');
  /** What the button opens, for assistive technology; null when it opens nothing of the app's. */
  readonly popup = input<'dialog' | null>('dialog');
}
