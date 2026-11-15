import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * Job toggle (docs/design-system/components/job.html): the main cell of a row on Jobs, one per
 * Worker job: its name over what it does. It is the disclosure button (APG Disclosure) that opens
 * the job's details in the row under it, `controls` naming them; `expanded` turns its chevron
 * down and sets `aria-expanded`. The page toggles it on click.
 */
@Component({
  selector: 'button[pk-job-toggle]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './job-toggle.html',
  styleUrl: './job-toggle.scss',
  host: {
    class: 'job__toggle',
    type: 'button',
    '[attr.aria-expanded]': 'expanded()',
    '[attr.aria-controls]': 'controls()',
  },
})
export class JobToggle {
  readonly name = input.required<string>();
  /** What the job does, such as "Wraps up Popkins whose time is up". */
  readonly does = input.required<string>();
  readonly expanded = input(false);
  /** The id of the job's details. */
  readonly controls = input.required<string>();
}
