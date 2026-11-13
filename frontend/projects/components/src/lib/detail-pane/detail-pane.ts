import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Avatar, PersonAvatar } from '../avatar/avatar';
import { PopkinTile } from '../popkin-tile/popkin-tile';
import { TimeLeft } from '../time-left/time-left';

/** A person in the list of the detail pane. */
export interface DetailPanePerson {
  name: string;
  avatar: PersonAvatar;
}

/**
 * Detail pane (docs/design-system/components/screen.html): from 1280 px, the Popkin beside its
 * thread: its tile and name, the time it has left, and the people who are here, each with the
 * dot that says so beside the label of the list. Below that it is absent. It is a child of the
 * app screen, which gives it its width (`--pk-detail-width`).
 */
@Component({
  selector: 'aside[pk-detail-pane]',
  imports: [Avatar, PopkinTile, TimeLeft],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './detail-pane.html',
  styleUrl: './detail-pane.scss',
  host: { class: 'detail-pane', '[attr.aria-label]': 'label()' },
})
export class DetailPane {
  /** The accessible name of the pane: "About this Popkin". */
  readonly label = input.required<string>();
  readonly emoji = input.required<string>();
  readonly name = input.required<string>();
  /** The time the Popkin has left, in words; none when null. */
  readonly timeLeft = input<string | null>(null);
  /** The heading of the list: "Here now". */
  readonly listLabel = input.required<string>();
  readonly people = input<readonly DetailPanePerson[]>([]);
  /** The muted line under the list: "and 9 others in this Popkin". */
  readonly more = input<string>();
}
