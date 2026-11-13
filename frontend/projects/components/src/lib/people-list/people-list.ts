import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Avatar } from '../avatar/avatar';

/** One person of the list: their name, and their avatar's colour and photo. */
export interface ListedPerson {
  name: string;
  initials: string;
  /** The `data-accent` value of the person's colour. */
  accent: string;
  photo: string | null;
}

/**
 * People list (docs/design-system/components/split-aside.html): the people already in, by
 * avatar and name, in two columns from 1024 px, and a line that counts the rest (`more`). It
 * sits in a split aside.
 */
@Component({
  selector: 'div[pk-people-list]',
  imports: [Avatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './people-list.html',
  styleUrl: './people-list.scss',
  host: { class: 'people-list' },
})
export class PeopleList {
  readonly people = input.required<readonly ListedPerson[]>();
  /** "and 6 more"; nothing when everyone is listed. */
  readonly more = input<string | null>(null);
}
