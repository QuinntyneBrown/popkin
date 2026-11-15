import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  output,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Icon } from '../icon/icon';

/**
 * Limit row (docs/design-system/components/limits.html, `limit`): one limit and its number. The
 * name labels the field and the help describes it; the unit is a word after it ("MB", "per
 * hour"). Arrow keys step the number. The field follows the text field's states: focus, invalid
 * with its `error`, disabled for a Viewer (through the form control). `dirty` edges a changed
 * value. A form control: bind it with `formControlName` or `ngModel`; the value is the field's
 * text, so an empty field is ''.
 */
@Component({
  selector: 'li[pk-limit-row]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './limit-row.html',
  styleUrl: './limit-row.scss',
  host: { class: 'limit' },
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => LimitRow), multi: true }],
})
export class LimitRow implements ControlValueAccessor {
  /** The id of the input; the help and the error take ids from it. */
  readonly fieldId = input.required<string>();
  /** What a person does: "Photo upload size". */
  readonly name = input.required<string>();
  /** "Before compression · default 15 MB". */
  readonly help = input<string>();
  /** A word: "MB", "codes", "per hour". */
  readonly unit = input.required<string>();
  readonly min = input<number>(1);
  readonly max = input<number>();
  readonly error = input<string>();
  /** The value differs from the saved one. */
  readonly dirty = input(false);

  /** Every change the admin makes. */
  readonly changed = output<string>();

  protected readonly value = signal('');
  protected readonly disabled = signal(false);
  protected readonly describedBy = computed(() =>
    this.error() ? `${this.fieldId()}-err` : this.help() ? `${this.fieldId()}-help` : null,
  );

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: string | number | null): void {
    this.value.set(value === null || value === undefined ? '' : String(value));
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
    const value = (event.target as HTMLInputElement).value;
    this.value.set(value);
    this.onChange(value);
    this.changed.emit(value);
  }

  protected blur(): void {
    this.onTouched();
  }
}
