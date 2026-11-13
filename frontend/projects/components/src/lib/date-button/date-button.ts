import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Icon } from '../icon/icon';

/** The end date control on How long (the mocks' `date-btn`): shows the end, opens the picker. */
@Component({
  selector: 'button[pk-date-button]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './date-button.html',
  styleUrl: './date-button.scss',
  host: { class: 'date-btn', type: 'button', 'aria-haspopup': 'dialog' },
})
export class DateButton {}
