import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Avatar } from '../avatar/avatar';

/**
 * Who chip (docs/design-system/components/chip.html and plan.html, `who-chip`): a person's
 * avatar and first name on a capsule. On a button it is a toggle that carries `aria-pressed`, set
 * by the consumer, and the one pressed is outlined (L2-069 AC2); on a link it reads in the default
 * colour (`a.who-chip`), as "It's been a while" on Today does. `pk-who-chips` and
 * `pk-drift-chips` compose it (ADR 0029).
 */
@Component({
  selector: 'button[pk-who-chip], a[pk-who-chip]',
  imports: [Avatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './who-chip.html',
  styleUrl: './who-chip.scss',
  host: { class: 'who-chip' },
})
export class WhoChip {
  readonly initials = input.required<string>();
  readonly photo = input<string | null>(null);
  /** The person's colour, for their initials. */
  readonly accent = input<string>();
}
