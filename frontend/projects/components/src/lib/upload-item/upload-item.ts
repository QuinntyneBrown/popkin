import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * Upload row (docs/design-system/components/upload-item.html): one photo about to be added, in
 * the list of the Add photos dialog. It shows the photo small, takes its caption, and says what
 * happened to it:
 *
 * - `ready`: the caption can be written. With an `error` the file breaks a rule and is left
 *   out; the error is the reason.
 * - `uploading` and `done`: the caption can no longer change. `status` lies over the thumbnail
 *   ("Uploading"); when `done` it is a tick, and the words are for assistive technology.
 * - `failed`: the `error` says so, and `retry` offers to upload it again.
 *
 * A file the browser cannot draw (HEIC) shows a blank thumbnail named by `alt`.
 */
@Component({
  selector: 'li[pk-upload-item]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './upload-item.html',
  styleUrl: './upload-item.scss',
  host: { class: 'upload-item' },
})
export class UploadItem {
  /** The id of the caption field. */
  readonly fieldId = input.required<string>();
  /** The photo, small: an object URL of the file. Null when there is nothing to draw. */
  readonly src = input<string | null>(null);
  /** The thumbnail's text alternative: "Photo 1". */
  readonly alt = input.required<string>();
  /** The label of the caption field, for assistive technology: "Caption for photo 1". */
  readonly label = input.required<string>();
  readonly placeholder = input('Add a caption');
  readonly maxlength = input(200);
  /** The caption, two-way. */
  readonly caption = model('');
  readonly state = input<'ready' | 'uploading' | 'done' | 'failed'>('ready');
  /** The state in words, over the thumbnail: "Uploading", "Added". None without it. */
  readonly status = input<string>();
  /** Why the file is left out, or that it did not upload: "Didn’t upload." */
  readonly error = input<string>();
  /** The words of the button after the error: "Try again". None without it. */
  readonly retry = input<string>();
  /** The count of characters, shown under the field near the limit: "196 of 200". */
  readonly count = input<string>();

  /** Try again was chosen. */
  readonly retried = output<void>();

  /** The browser could not draw the file. */
  protected readonly broken = signal(false);
  protected readonly locked = computed(
    () => this.state() === 'uploading' || this.state() === 'done',
  );
  protected readonly describedBy = computed(() => {
    const ids = [
      this.error() ? `${this.fieldId()}-err` : null,
      this.count() ? `${this.fieldId()}-count` : null,
    ].filter(Boolean);
    return ids.length ? ids.join(' ') : null;
  });

  constructor() {
    effect(() => {
      this.src();
      this.broken.set(false);
    });
  }

  protected typed(event: Event): void {
    this.caption.set((event.target as HTMLInputElement).value);
  }
}
