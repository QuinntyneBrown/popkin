import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * Add field (docs/design-system/components/task.html): the quiet pill field over a list of
 * follow-ups, "Something to do for Chidi…". Enter adds what was typed (`added`, trimmed) and
 * empties the field; nothing is added while it is blank. Its `label` is for assistive technology.
 */
@Component({
  selector: 'div[pk-add-field]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './add-field.html',
  styleUrl: './add-field.scss',
  host: { class: 'add-field' },
})
export class AddField {
  readonly label = input.required<string>();
  readonly placeholder = input.required<string>();
  /** The input's id, so the label names it. */
  readonly fieldId = input.required<string>();
  readonly added = output<string>();

  protected add(field: HTMLInputElement): void {
    const text = field.value.trim();
    if (!text) return;
    this.added.emit(text);
    field.value = '';
  }
}
