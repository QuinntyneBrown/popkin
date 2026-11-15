import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  model,
  viewChildren,
} from '@angular/core';
import { PopkinTile } from '../popkin-tile/popkin-tile';

export interface PickListOption {
  id: string;
  name: string;
  emoji: string;
  /** The Popkin's accent, for its tile: "teal". */
  accent: string;
  /** Said after the name in a quieter mono face: an invite code. */
  detail: string;
}

/**
 * Pick list (docs/design-system/components/feature-panel.html, the add dialog): a listbox of
 * Popkins, each its tile, name and invite code, one of which is picked (`value`). Notes, such as
 * "Lakeside Weekend already has Schedules." or "No live Popkin matches “zzz”.", follow the
 * options as plain lines. Arrow keys move between the options; Tab leaves the list.
 */
@Component({
  selector: 'ul[pk-pick-list]',
  imports: [PopkinTile],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pick-list.html',
  styleUrl: './pick-list.scss',
  host: { class: 'pick-list', role: 'listbox', '[attr.aria-label]': 'label()' },
})
export class PickList {
  readonly label = input.required<string>();
  readonly options = input<readonly PickListOption[]>([]);
  readonly notes = input<readonly string[]>([]);
  /** The picked option's id; null when none is. */
  readonly value = model<string | null>(null);
  readonly disabled = input(false);

  private readonly buttons = viewChildren<ElementRef<HTMLButtonElement>>('option');

  /** The option that takes Tab: the picked one, or else the first. */
  protected tabbable(id: string, index: number): boolean {
    const picked = this.value();
    return picked && this.options().some((o) => o.id === picked) ? id === picked : index === 0;
  }

  protected move(event: KeyboardEvent, index: number): void {
    const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const options = this.options();
    const next = (index + step + options.length) % options.length;
    this.buttons()[next].nativeElement.focus();
  }
}
