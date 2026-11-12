import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
} from '@angular/core';

export interface FormProblem {
  /** The id of the field the problem is about. */
  fieldId: string;
  /** The field's name and the fix, the same words as the inline error. */
  message: string;
}

/**
 * Form summary (docs/design-system/components/form-summary.html): every problem of a submitted
 * form, counted, each a link to its field. It takes focus and is announced as an alert.
 */
@Component({
  selector: 'div[pk-form-summary]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './form-summary.html',
  styleUrl: './form-summary.scss',
  host: { class: 'form-summary', role: 'alert', tabindex: '-1' },
})
export class FormSummary {
  readonly problems = input.required<FormProblem[]>();

  protected readonly title = computed(() => {
    const count = this.problems().length;
    return count === 1 ? 'One thing to fix' : `${count} things to fix`;
  });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);

  focus(): void {
    this.host.nativeElement.focus();
  }

  protected goTo(event: Event, fieldId: string): void {
    event.preventDefault();
    this.document.getElementById(fieldId)?.focus();
  }
}
