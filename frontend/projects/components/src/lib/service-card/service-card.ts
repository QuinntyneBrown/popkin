import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Service card (docs/design-system/components/service-health.html, `service`): one service on
 * Health, named by its heading, with its state in words in a status pill (`[slot=status]`), a
 * note led by its key figure, and its last 30 days (`[slot=uptime]`, the uptime bar) over a
 * scale: "30 days ago · 99.98% up · Today". From 768 px the uptime sits beside the name. Ruled
 * from the service above; nothing in it can be pressed.
 */
@Component({
  selector: 'li[pk-service-card]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './service-card.html',
  styleUrl: './service-card.scss',
  host: { class: 'service' },
})
export class ServiceCard {
  /** "Realtime hub". */
  readonly name = input.required<string>();
  /** The key figure, first in the note: "p95 182 ms". */
  readonly figure = input<string>();
  /** The rest of the note: "1,240 requests a second". */
  readonly note = input<string>();
  /** "99.98% up". */
  readonly uptime = input<string>();
  readonly from = input('30 days ago');
  readonly to = input('Today');
}
