import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type UptimeDay = 'up' | 'degraded' | 'down';

/**
 * Uptime (docs/design-system/components/charts.html): a service's last thirty days on Health, one
 * bar a day, oldest first: green when it was up, amber when degraded, red when down. Hidden from
 * assistive technology: the scale under it says the share of time up in words ("99.98% up").
 */
@Component({
  selector: 'div[pk-uptime]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './uptime.html',
  styleUrl: './uptime.scss',
  host: { class: 'uptime', 'aria-hidden': 'true' },
})
export class Uptime {
  readonly days = input.required<readonly UptimeDay[]>();
}
