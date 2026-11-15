import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Status } from '../status/status';

/**
 * Report detail (docs/design-system/components/report-review.html): the open report on Reports.
 * Its first line says what kind of thing was reported, in which Popkin (a link to it) and how long
 * ago; the reason is its heading. The evidence and the facts about it are its content, spaced
 * under the heading.
 */
@Component({
  selector: 'div[pk-report-detail]',
  imports: [RouterLink, Status],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './report-detail.html',
  styleUrl: './report-detail.scss',
  host: { class: 'report-detail' },
})
export class ReportDetail {
  /** The kind of thing reported: "Message", "Photo", "Experience". */
  readonly kind = input.required<string>();
  readonly popkin = input.required<string>();
  readonly popkinLink = input.required<string>();
  /** How long ago, such as "18 min ago". */
  readonly when = input.required<string>();
  readonly reason = input.required<string>();
  /** The heading's id, so the panel and its actions can be labelled by it. */
  readonly headingId = input('report-title');
}
