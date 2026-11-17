import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** One item: the bold term that sorts it ("Removed:") and the rest of its sentence. */
export interface Term {
  term: string;
  text: string;
}

/**
 * Term list (docs/design-system/components/term-list.html): a short list in a dialog, each item
 * a bold term and its sentence, such as what goes and what stays when an account is deleted.
 */
@Component({
  selector: 'ul[pk-term-list]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './term-list.html',
  styleUrl: './term-list.scss',
  host: { class: 'stack stack--sm text-sm' },
})
export class TermList {
  readonly items = input.required<readonly Term[]>();
}
