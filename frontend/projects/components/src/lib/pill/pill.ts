import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Pill (docs/design-system/components/chip.html): a short line on a raised capsule, such as who
 * invited you. Project an avatar into `[slot=start]`; `lead` is the part of the line in ink.
 */
@Component({
  selector: 'div[pk-pill]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pill.html',
  styleUrl: './pill.scss',
  host: { class: 'pill' },
})
export class Pill {
  readonly lead = input<string>();
  readonly text = input.required<string>();
}
