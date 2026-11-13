import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';

/**
 * Files input: the device's own picker for several files, with nothing of its own to see. A
 * button of the screen calls `open()`; on a phone the picker also offers the camera. It tells
 * the files chosen once and forgets them, so the same ones can be chosen again.
 */
@Component({
  selector: 'pk-files-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './files-input.html',
  styleUrl: './files-input.scss',
})
export class FilesInput {
  /** The file input's `accept`. */
  readonly accept = input('');
  readonly picked = output<File[]>();

  private readonly file = viewChild.required<ElementRef<HTMLInputElement>>('file');

  open(): void {
    this.file().nativeElement.click();
  }

  protected choose(): void {
    const input = this.file().nativeElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (files.length > 0) this.picked.emit(files);
  }
}
