import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Day divider (docs/design-system/components/message.html): the day the messages under it were
 * sent: "Today", "Yesterday", then the weekday.
 */
@Component({
  selector: 'div[pk-day-divider]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './day-divider.html',
  styleUrl: './day-divider.scss',
  host: { class: 'day-divider', role: 'separator' },
})
export class DayDivider {
  readonly label = input.required<string>();
}
