import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import { DateButton } from '../date-button/date-button';
import { Icon } from '../icon/icon';
import { IconButton } from '../icon-button/icon-button';

/**
 * Picture field (docs/design-system/components/photo-picker.html, `picture-field`): the one
 * picture of something being shared, such as an experience. Until there is one it is a wide
 * button, "Add a picture (optional)", that opens the device's picker; with a `picture` it shows
 * it, with a button over it that removes it. An `error` under it says why a file was refused.
 *
 * It checks nothing itself: the file chosen is told as `picked`, and the consumer sets
 * `picture` (an object URL, or the address of the saved one) or `error`. `removed` asks for the
 * picture to be taken away. The focus follows: to Remove when a picture arrives, back to the
 * button when it goes.
 */
@Component({
  selector: 'div[pk-picture-field]',
  imports: [DateButton, Icon, IconButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './picture-field.html',
  styleUrl: './picture-field.scss',
  host: { class: 'picture-field' },
})
export class PictureField {
  /** The id its parts are named from; a form summary links to it. */
  readonly fieldId = input.required<string>();
  /** The words of the button: "Add a picture". */
  readonly label = input.required<string>();
  /** After the label, muted: "(optional)". */
  readonly optional = input<string>();
  /** The address of the chosen picture, such as an object URL. */
  readonly picture = input<string | null>(null);
  /** What the chosen picture is, for assistive technology. */
  readonly alt = input('The picture you chose');
  /** The name of the button that takes the picture away. */
  readonly removeLabel = input('Remove picture');
  readonly error = input<string>();
  /** The file input's `accept`. */
  readonly accept = input('image/*');
  /** The picture stays as it is, while the form is being saved. */
  readonly disabled = input(false);

  readonly picked = output<File>();
  readonly removed = output<void>();

  private readonly file = viewChild.required<ElementRef<HTMLInputElement>>('file');
  private readonly add = viewChild<unknown, ElementRef<HTMLButtonElement>>('add', {
    read: ElementRef,
  });
  private readonly remove = viewChild<unknown, ElementRef<HTMLButtonElement>>('remove', {
    read: ElementRef,
  });
  /** The member acted here, so the focus goes to the part that takes the other's place. */
  private follow = false;

  constructor() {
    effect(() => {
      const next = this.picture() ? this.remove() : this.add();
      if (!next || !this.follow) return;
      this.follow = false;
      next.nativeElement.focus();
    });
  }

  protected open(): void {
    this.file().nativeElement.click();
  }

  protected choose(): void {
    const input = this.file().nativeElement;
    const file = input.files?.[0];
    // Cleared so choosing the same file again, after a refusal, is still a change.
    input.value = '';
    if (!file) return;
    this.follow = true;
    this.picked.emit(file);
  }

  protected take(): void {
    this.follow = true;
    this.removed.emit();
  }
}
