import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Health summary (docs/design-system/components/service-health.html, `health-summary`): the one
 * line above the services that says how the system is, as a status: all good on success, one
 * service `degraded` on warning, `down` on solid danger. The title says the state in words, so
 * the colour is not the only sign.
 */
@Component({
  selector: 'div[pk-health-summary]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './health-summary.html',
  styleUrl: './health-summary.scss',
  host: {
    class: 'health-summary',
    role: 'status',
    '[class.health-summary--degraded]': "state() === 'degraded'",
    '[class.health-summary--down]': "state() === 'down'",
  },
})
export class HealthSummary {
  readonly state = input<'ok' | 'degraded' | 'down'>('ok');
  /** "Realtime hub is degraded". */
  readonly heading = input.required<string>();
  /** What it means for people: "Messages still arrive, a few seconds late …". */
  readonly text = input<string>();
}
