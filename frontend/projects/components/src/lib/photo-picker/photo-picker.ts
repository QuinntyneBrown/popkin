import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { Avatar } from '../avatar/avatar';
import { Icon } from '../icon/icon';

/**
 * Photo picker (docs/design-system/components/photo-picker.html): the person's avatar as a
 * button that opens the device's photo chooser. It shows their initial until `photo` is set,
 * a line under it (`caption`), and `error` in its place when a file was refused. It checks
 * nothing itself: the file chosen is emitted as `picked`.
 */
@Component({
  selector: 'div[pk-photo-picker]',
  imports: [Avatar, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './photo-picker.html',
  styleUrl: './photo-picker.scss',
  host: { class: 'photo-picker' },
})
export class PhotoPicker {
  /** The accessible name of the button: "Add a photo", "Change your photo". */
  readonly label = input.required<string>();
  /** The letter shown until there is a photo. */
  readonly initial = input('');
  /** The address of the chosen photo, such as an object URL. */
  readonly photo = input<string | null>(null);
  readonly caption = input<string>();
  readonly error = input<string>();
  /** The file input's `accept`. */
  readonly accept = input('image/*');
  readonly disabled = input(false);
  readonly picked = output<File>();

  private readonly file = viewChild.required<ElementRef<HTMLInputElement>>('file');

  protected open(): void {
    this.file().nativeElement.click();
  }

  protected choose(): void {
    const input = this.file().nativeElement;
    const file = input.files?.[0];
    // Cleared so choosing the same file again, after a refusal, is still a change.
    input.value = '';
    if (file) this.picked.emit(file);
  }
}
