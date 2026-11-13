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
 * Text field (docs/design-system/components/text-field.html): a visible label, the field, and the
 * help or the error under it. An error replaces the help, marks the field `aria-invalid` and is
 * its accessible description. Works with Angular forms as a value accessor.
 */
@Component({
  selector: 'div[pk-text-field]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './text-field.html',
  styleUrl: './text-field.scss',
  host: { class: 'field' },
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TextField), multi: true },
  ],
})
export class TextField implements ControlValueAccessor {
  /** The id of the input; form summaries link to it. */
  readonly fieldId = input.required<string>();
  readonly label = input.required<string>();
  /** After the label, muted, on a field that may stay empty: "(optional)". */
  readonly optional = input<string>();
  /** `row` puts the label in a row with the `[slot=label-end]` content, such as a switch. */
  readonly labelLayout = input<'above' | 'row'>('above');
  readonly type = input<'text' | 'tel' | 'email' | 'date' | 'time'>('text');
  readonly inputmode = input<string>();
  readonly autocomplete = input<string>();
  /** `none` for a word that must be typed as it is, such as "delete". */
  readonly autocapitalize = input<string>();
  readonly placeholder = input<string>();
  readonly maxlength = input<number>();
  readonly hint = input<string>();
  readonly error = input<string>();
  /** Announces the error itself, where no form summary does (the code screen). */
  readonly announceError = input(false);
  /** Ignores anything typed that is not a digit, as the code field does (L2-004 AC6). */
  readonly digitsOnly = input(false);
  readonly variant = input<'default' | 'code'>('default');
  readonly readonly = input(false);

  /** Every change the person makes, digits filtered or not. */
  readonly changed = output<string>();

  protected readonly value = signal('');
  protected readonly disabled = signal(false);
  protected readonly describedBy = computed(() =>
    this.error() ? `${this.fieldId()}-err` : this.hint() ? `${this.fieldId()}-hint` : null,
  );

  private readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('field');
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  focus(): void {
    this.inputRef().nativeElement.focus();
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
    const element = event.target as HTMLInputElement;
    if (this.digitsOnly()) {
      const digits = element.value.replace(/\D/g, '');
      if (digits !== element.value) element.value = digits;
    }
    const value = element.value;
    this.value.set(value);
    this.onChange(value);
    this.changed.emit(value);
  }

  protected blur(): void {
    this.onTouched();
  }
}
