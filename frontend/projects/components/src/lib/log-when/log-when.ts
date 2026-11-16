import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * Log when (docs/design-system/components/form-sections.html, `log-form`): when a conversation
 * is logged, "Today, 8:40 am", beside how they talked, with a calendar.
 */
@Component({
  selector: 'span[pk-log-when]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './log-when.html',
  styleUrl: './log-when.scss',
  host: { class: 'log-when' },
})
export class LogWhen {}
