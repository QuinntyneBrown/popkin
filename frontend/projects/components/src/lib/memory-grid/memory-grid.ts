import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface Memory {
  photo: string;
  /** What the photo shows, its alternative text: "Hot sauce night". */
  alt: string;
  /** The caption under it, with its date: "Hot sauce night · Aug 8". */
  caption: string;
}

/**
 * Memory grid (docs/design-system/components/contact-id.html): the photos of times together on a
 * contact's Memories & files, square, two across and four from 640 px, each captioned.
 */
@Component({
  selector: 'div[pk-memory-grid]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './memory-grid.html',
  styleUrl: './memory-grid.scss',
  host: { class: 'memory-grid' },
})
export class MemoryGrid {
  readonly memories = input.required<readonly Memory[]>();
}
