import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { PopkinTile } from '../popkin-tile/popkin-tile';

/**
 * The Popkin name in its preview row (the text field's display variant): the tile shows the
 * chosen emoji in the chosen colour beside the name. At the limit a count shows "40 of 40".
 */
@Component({
  selector: 'div[pk-name-preview]',
  imports: [PopkinTile],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './name-preview.html',
  styleUrl: './name-preview.scss',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => NamePreview), multi: true },
  ],
})
export class NamePreview implements ControlValueAccessor {
  readonly emoji = input.required<string>();
  readonly label = input('Popkin name');
  readonly placeholder = input<string>();
  readonly maxlength = input(40);

  protected readonly value = signal('');
  protected readonly atLimit = computed(() => this.value().length >= this.maxlength());
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  protected input(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.value.set(value);
    this.onChange(value);
  }

  protected blur(): void {
    this.onTouched();
  }
}
