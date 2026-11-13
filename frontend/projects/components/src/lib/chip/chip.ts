import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Chip (docs/design-system/components/chip.html): a short choice on a capsule. A chip that
 * filters carries `aria-pressed`, set by the consumer; a chip that is one of a radio group
 * (`pk-choice-chips`) carries `aria-checked`; an `outline` chip is a suggestion to take, such
 * as a first message.
 */
@Component({
  selector: 'button[pk-chip], a[pk-chip]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chip.html',
  styleUrl: './chip.scss',
  host: {
    class: 'chip',
    '[class.chip--outline]': 'outline()',
  },
})
export class Chip {
  readonly outline = input(false);
}
