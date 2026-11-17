import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { Avatar } from '../avatar/avatar';

/** Someone offered in a tick list. */
export interface TickListItem {
  id: string;
  name: string;
  initials?: string;
  photo?: string | null;
  /** The `data-accent` of their colour. */
  accent: string;
  /** Ticked and unavailable, with why beside the name: "In the group". */
  locked?: string | null;
}

/**
 * Tick list (docs/design-system/components/list-row.html, `divided` short rows as checkboxes):
 * people to tick, each a native checkbox labelled by their face and name (L2-147 AC3). One
 * already in is ticked and disabled, and says why. The list is named by `label`.
 */
@Component({
  selector: 'ul[pk-tick-list]',
  imports: [Avatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tick-list.html',
  styleUrl: './tick-list.scss',
  host: { class: 'divided', '[attr.aria-label]': 'label()' },
})
export class TickList {
  readonly label = input.required<string>();
  readonly items = input.required<readonly TickListItem[]>();
  /** The ids ticked, not counting those locked in. */
  readonly value = model<readonly string[]>([]);
  readonly disabled = input(false);

  protected ticked(id: string): boolean {
    return this.value().includes(id);
  }

  protected toggle(id: string, on: boolean): void {
    this.value.update((ids) => (on ? [...ids, id] : ids.filter((i) => i !== id)));
  }
}
