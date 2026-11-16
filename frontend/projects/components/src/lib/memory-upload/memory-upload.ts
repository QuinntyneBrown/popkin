import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { Progress } from '../progress/progress';

/**
 * Memory upload (docs/design-system/components/form-sections.html, `memory-upload`): the photo
 * or file chosen in Add to memories, by its name, and while it is sent how much has gone, with a
 * progress bar named "Uploading {name}" (L2-136 AC4). A file the browser cannot draw shows its
 * tile instead of a picture.
 */
@Component({
  selector: 'div[pk-memory-upload]',
  imports: [Icon, Progress],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './memory-upload.html',
  styleUrl: './memory-upload.scss',
  host: { class: 'memory-upload' },
})
export class MemoryUpload {
  /** The chosen photo, such as an object URL; none for a file. */
  readonly src = input<string | null>(null);
  readonly alt = input('');
  readonly name = input.required<string>();
  /** "Uploading · 2.4 of 3.1 MB", while it is sent. */
  readonly status = input<string>();
  /** How much is sent, 0 to 100, while it is sent. */
  readonly percent = input<number | null>(null);
}
