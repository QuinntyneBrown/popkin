import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * History item (docs/design-system/components/activity-lists.html, `history`): one past item,
 * such as an announcement that ran, with when and by whom. Text only; ruled from the one above.
 */
@Component({
  selector: 'li[pk-history-item]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './history-item.html',
  styleUrl: './history-item.scss',
  host: { class: 'history' },
})
export class HistoryItem {
  readonly text = input.required<string>();
  /** "1–8 Jul · Lena Fischer". */
  readonly when = input.required<string>();
}
