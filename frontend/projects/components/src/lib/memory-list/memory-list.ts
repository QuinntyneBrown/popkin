import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';

/** One file or note kept about a contact: "Wedding speech.pdf", "Sep 2021 · 84 KB". */
export interface MemoryRow {
  kind: 'file' | 'note';
  title: string;
  text: string;
  /** A file's download address; its title links to it. */
  href?: string;
}

/**
 * Memory list (docs/design-system/components/contact-id.html, `memory-list`): the files and notes
 * on a profile's Memories & files, each with its tile, below the photos. A file opens by its
 * name, downloaded under it.
 */
@Component({
  selector: 'ul[pk-memory-list]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './memory-list.html',
  styleUrl: './memory-list.scss',
  host: { class: 'memory-list' },
})
export class MemoryList {
  readonly rows = input.required<readonly MemoryRow[]>();
}
