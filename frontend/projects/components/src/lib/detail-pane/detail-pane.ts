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
 * Detail pane (docs/design-system/components/screen.html): from 1280 px, the third column of a
 * thread (L2-058 AC12). Below that it is absent. It is a child of the app screen, which gives it
 * its width (`--pk-detail-width`).
 *
 * Beside the Everyone thread it is the Popkin: its tile and name, the time it has left, and the
 * people who are here, each with the dot that says so, under `listLabel`. Given a `person` it is
 * the other member of a direct message (`detail-pane--person`), centred: their avatar and
 * `name`, "In {emoji} {place}", the `[slot=action]` content ("Call Walt", a small secondary
 * button) and, when there are any, the photos `shared` between the two under `listLabel`
 * ("Shared between you").
 */
@Component({
  selector: 'aside[pk-detail-pane]',
  imports: [Avatar, PopkinTile, TimeLeft],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './detail-pane.html',
  styleUrl: './detail-pane.scss',
  host: {
    class: 'detail-pane',
    '[class.detail-pane--person]': '!!person()',
    '[attr.aria-label]': 'label()',
  },
})
export class DetailPane {
  /** The accessible name of the pane: "About this Popkin". */
  readonly label = input.required<string>();
  /** The Popkin's emoji: on its tile, or in the line of the place of a `person`. */
  readonly emoji = input.required<string>();
  /** The Popkin's name, or the person's. */
  readonly name = input.required<string>();
  /** The other member of a direct message: the pane is about them. */
  readonly person = input<PersonAvatar>();
  /** Where the person is met, the Popkin's name: "Lakeside Weekend". */
  readonly place = input('');
  /** The photos shared between the two, by address, the latest first. */
  readonly shared = input<readonly string[]>([]);
  /** The time the Popkin has left, in words; none when null. */
  readonly timeLeft = input<string | null>(null);
  /** The heading of the list: "Here now", or "Shared between you". */
  readonly listLabel = input.required<string>();
  readonly people = input<readonly DetailPanePerson[]>([]);
  /** The muted line under the list: "and 9 others in this Popkin". */
  readonly more = input<string>();
}
