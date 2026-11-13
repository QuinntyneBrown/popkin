import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { Avatar, PersonAvatar } from '../avatar/avatar';
import { EmptyState } from '../empty-state/empty-state';
import { SearchField } from '../search-field/search-field';

/** A member the picker offers. */
export interface PickableMember {
  /** What tells this member from the others, and `chosen` carries: their membership id. */
  key: string;
  /** "Walt Brennan". */
  name: string;
  avatar: PersonAvatar;
}

/**
 * Member picker (docs/design-system/components/list-row.html, `divided` short rows): the inside
 * of the New message dialog (L2-022 AC4). A pill search field, "Search members", then the
 * members it is given, each a button with their avatar and name, parted by hairlines. The
 * consumer filters the members by `query`; with none left it says "Nobody by that name" and
 * that only members of the Popkin (`popkinName`) can be messaged here.
 */
@Component({
  selector: 'div[pk-member-picker]',
  imports: [Avatar, EmptyState, SearchField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './member-picker.html',
  styleUrl: './member-picker.scss',
  host: { class: 'member-picker' },
})
export class MemberPicker {
  /** The members that match the query, in the order to show them. */
  readonly members = input.required<readonly PickableMember[]>();
  /** What the person typed in the search field. */
  readonly query = model('');
  /** The Popkin's name, in the line under "Nobody by that name": "Lakeside Weekend". */
  readonly popkinName = input.required<string>();
  /** The accessible name of the search field and its placeholder. */
  readonly searchLabel = input('Search members');

  /** A member was chosen: their `key`. */
  readonly chosen = output<string>();
}
