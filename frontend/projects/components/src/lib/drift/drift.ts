import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * "It's been a while" on Today (docs/design-system/components/chip.html, `section.drift`): the
 * people not talked to in a while, set apart under Recently by a hairline. The line and the
 * `pk-drift-chips` are the consumer's; the heading is for assistive technology alone
 * (L2-125 AC7).
 */
@Component({
  selector: 'section[pk-drift]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './drift.html',
  styleUrl: './drift.scss',
  host: { class: 'drift', '[attr.aria-labelledby]': 'headingId()' },
})
export class Drift {
  readonly headingId = input.required<string>();
  readonly heading = input.required<string>();
}
