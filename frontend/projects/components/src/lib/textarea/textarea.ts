import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  forwardRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Icon } from '../icon/icon';

/**
 * Textarea (docs/design-system/components/textarea.html): a field of several lines, such as a
 * comment on an experience. A visible label, the field, and the help or the error under it; the
 * help says the limit ("Up to 500 characters."), and `maxlength` stops the text there. An error
 * replaces the help, marks the field `aria-invalid` and is its accessible description. Works
 * with Angular forms as a value accessor.
 */
@Component({
  selector: 'div[pk-textarea]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './textarea.html',
  styleUrl: './textarea.scss',
  host: { class: 'field' },
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Textarea), multi: true }],
})
export class Textarea implements ControlValueAccessor {
  /** The id of the field; form summaries link to it. */
  readonly fieldId = input.required<string>();
  readonly label = input.required<string>();
  /** How many lines the field shows before it scrolls. */
  readonly rows = input(4);
  readonly placeholder = input<string>();
  readonly maxlength = input<number>();
  readonly hint = input<string>();
  readonly error = input<string>();
  /** The text stays as it is, while the form is being saved. */
  readonly readonly = input(false);

  /** Every change the person makes. */
  readonly changed = output<string>();

  protected readonly value = signal('');
  protected readonly disabled = signal(false);
  protected readonly describedBy = computed(() =>
    this.error() ? `${this.fieldId()}-err` : this.hint() ? `${this.fieldId()}-hint` : null,
  );

  private readonly fieldRef = viewChild.required<ElementRef<HTMLTextAreaElement>>('field');
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  focus(): void {
    this.fieldRef().nativeElement.focus();
  }

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }

  protected input(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.value.set(value);
    this.onChange(value);
    this.changed.emit(value);
  }

  protected blur(): void {
    this.onTouched();
  }
}
