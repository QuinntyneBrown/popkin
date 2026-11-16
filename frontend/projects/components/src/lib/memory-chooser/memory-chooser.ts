import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { AddCard } from '../add-card/add-card';
import { Icon } from '../icon/icon';

/**
 * Memory chooser (docs/design-system/components/form-sections.html, `memory-chooser`): the wide
 * dashed card of Add to memories that opens the device's picker, "Choose a photo", with a hint
 * under it and, when the file was refused, why. It checks nothing itself: the file chosen is
 * told as `picked`, and the consumer sets `error`.
 */
@Component({
  selector: 'div[pk-memory-chooser]',
  imports: [AddCard, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './memory-chooser.html',
  styleUrl: './memory-chooser.scss',
  host: { class: 'memory-chooser' },
})
export class MemoryChooser {
  /** The id its parts are named from; a form summary links to its error. */
  readonly fieldId = input.required<string>();
  /** "Choose a photo", or "Choose another photo" once one was refused. */
  readonly label = input.required<string>();
  /** A visible name above the card, as Log's "Photo". */
  readonly heading = input<string>();
  readonly hint = input<string>();
  readonly error = input<string>();
  /** The file input's `accept`. */
  readonly accept = input('');
  readonly disabled = input(false);
  readonly picked = output<File>();

  private readonly file = viewChild.required<ElementRef<HTMLInputElement>>('file');

  protected open(): void {
    this.file().nativeElement.click();
  }

  protected choose(): void {
    const input = this.file().nativeElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) this.picked.emit(file);
  }

  protected describedBy(): string | null {
    const ids = [
      this.hint() ? `${this.fieldId()}-hint` : null,
      this.error() ? `${this.fieldId()}-error` : null,
    ].filter((id) => id !== null);
    return ids.length ? ids.join(' ') : null;
  }
}
