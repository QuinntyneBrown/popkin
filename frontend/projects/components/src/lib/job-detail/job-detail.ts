import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Job detail (docs/design-system/components/job.html): a job's open details on Jobs, in the row
 * under its toggle: its facts (next run, runs today, failures, class) as key values in
 * `[slot=facts]`, then the `log` of its last failed run, in code type on the inverse surface.
 */
@Component({
  selector: 'div[pk-job-detail]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './job-detail.html',
  styleUrl: './job-detail.scss',
  host: { class: 'job-detail' },
})
export class JobDetail {
  /** The lines of the log, one a line. None without it. */
  readonly log = input<string>();
}
