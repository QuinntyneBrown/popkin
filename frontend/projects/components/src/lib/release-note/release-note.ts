import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';

/** One fact of the running release. */
export interface ReleaseFact {
  label: string;
  value: string;
  /** An id, set in mono: "v2025.07.11", "a41c9e2". */
  mono?: boolean;
}

/**
 * Release note (docs/design-system/components/settings-list.html, `release`): the dark band
 * above the settings that says where they come from, with the release that is running: Release,
 * Commit, Deployed. The note is the default slot. From 768 px the facts sit beside the note.
 */
@Component({
  selector: 'div[pk-release-note]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './release-note.html',
  styleUrl: './release-note.scss',
  host: { class: 'release' },
})
export class ReleaseNote {
  readonly facts = input.required<readonly ReleaseFact[]>();
}
