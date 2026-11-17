import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  model,
  viewChildren,
} from '@angular/core';
import { Avatar } from '../avatar/avatar';
import { Icon } from '../icon/icon';

/** Someone Connect offers in "Who". */
export interface PersonChoiceOption {
  id: string;
  name: string;
  initials?: string;
  photo?: string | null;
  /** The `data-accent` of their colour. */
  accent: string;
}

/**
 * Person choice (docs/design-system/components/list-row.html, `divided` short rows as radios):
 * Connect's "Who", a radio group of contacts, each their face and name (L2-150 AC1). Arrow keys
 * move and choose; Tab enters at the chosen one, else the first. Refused, the list is
 * `aria-invalid` and described by its error under it (L2-150 AC2).
 */
@Component({
  selector: 'div[pk-person-choice]',
  imports: [Avatar, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './person-choice.html',
  styleUrl: './person-choice.scss',
  host: { class: 'person-choice' },
})
export class PersonChoice {
  readonly label = input('Who');
  readonly options = input.required<readonly PersonChoiceOption[]>();
  /** The chosen person's id; null when nobody is. */
  readonly value = model<string | null>(null);
  readonly disabled = input(false);
  /** The list's id, which a form summary links to; its error is `{fieldId}-err`. */
  readonly fieldId = input.required<string>();
  /** Refused: the list is `aria-invalid` and described by this, shown under it (L2-150 AC2). */
  readonly error = input<string>();

  private readonly buttons = viewChildren<ElementRef<HTMLButtonElement>>('option');

  protected tabbable(id: string, index: number): boolean {
    const chosen = this.value();
    return chosen && this.options().some((o) => o.id === chosen) ? id === chosen : index === 0;
  }

  protected move(event: KeyboardEvent, index: number): void {
    const step =
      event.key === 'ArrowDown' || event.key === 'ArrowRight'
        ? 1
        : event.key === 'ArrowUp' || event.key === 'ArrowLeft'
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const options = this.options();
    const next = (index + step + options.length) % options.length;
    this.value.set(options[next].id);
    this.buttons()[next].nativeElement.focus();
  }
}
