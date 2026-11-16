import { ChangeDetectionStrategy, Component, input } from '@angular/core';

let next = 0;

/**
 * Log section (docs/design-system/components/log-form.html): a part of a log entry named like a
 * field, such as "Anything you said you’d do?" with its hint, or "Worth remembering" set off by a
 * hairline (`divided`).
 */
@Component({
  selector: 'section[pk-log-section]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './log-section.html',
  styleUrl: './log-section.scss',
  host: {
    class: 'log-section',
    '[class.log-section--divided]': 'divided()',
    '[attr.aria-labelledby]': 'headingId',
  },
})
export class LogSection {
  readonly heading = input.required<string>();
  readonly hint = input<string>();
  /** Set off from the parts above by a hairline. */
  readonly divided = input(false);

  protected readonly headingId = `log-section-${next++}`;
}
