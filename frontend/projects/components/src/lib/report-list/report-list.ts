import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';
import { Status, StatusTone } from '../status/status';

/** A row of the list: what it is, where, and its meta line ending in a state, as a pill when `pill` is set. */
export interface ReportListItem {
  id: string;
  icon: IconName;
  reason: string;
  where: string;
  meta: string;
  /** The state at the meta line's end: "Dates through 2027". */
  state: string;
  /** Draws the state as a status pill of this tone: a warning, a draft. */
  pill?: StatusTone | null;
  /** Where choosing it leads. */
  link: string | readonly unknown[];
  /** The one chosen: `aria-current`, with a bar as well as the fill. */
  current: boolean;
}

/**
 * Report list (docs/design-system/components/report-review.html): the list beside a detail, each
 * row a link, the chosen one current. Name the list with `aria-label`.
 */
@Component({
  selector: 'ul[pk-report-list]',
  imports: [Icon, RouterLink, Status],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './report-list.html',
  styleUrl: './report-list.scss',
  host: { class: 'report-list' },
})
export class ReportList {
  readonly items = input.required<readonly ReportListItem[]>();
}
