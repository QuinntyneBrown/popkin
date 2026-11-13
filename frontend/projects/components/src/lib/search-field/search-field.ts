import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  model,
  viewChild,
} from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * Search field (docs/design-system/components/text-field.html, `search`): a pill field with the
 * search icon before the text, labelled by its `label`, which is its placeholder too ("Search
 * members"). It has no visible label: the icon and the placeholder say what it is, and the name
 * says it to assistive technology. `value` is two-way and changes as the person types.
 */
@Component({
  selector: 'div[pk-search-field]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './search-field.html',
  styleUrl: './search-field.scss',
  host: { class: 'search' },
})
export class SearchField {
  /** The accessible name of the field and its placeholder. */
  readonly label = input.required<string>();
  readonly value = model('');

  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');

  /** Moves focus to the field. */
  focus(): void {
    this.field().nativeElement.focus();
  }

  protected typed(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }
}
