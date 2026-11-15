import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** One unsaved change: the limit, its saved value, its new value and its unit. */
export interface LimitChange {
  name: string;
  from: string;
  to: string;
  unit: string;
}

/**
 * Change list (docs/design-system/components/limits.html, `change-list`): the changes a save
 * dialog asks to confirm, "Messages: ~~30~~ → **20** per minute", the old value struck through.
 */
@Component({
  selector: 'ul[pk-change-list]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './change-list.html',
  styleUrl: './change-list.scss',
  host: { class: 'change-list' },
})
export class ChangeList {
  readonly changes = input.required<readonly LimitChange[]>();
}
