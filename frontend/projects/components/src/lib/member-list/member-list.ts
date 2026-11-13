import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Avatar } from '../avatar/avatar';
import { ListedPerson } from '../people-list/people-list';

/** A member of the list: a person and, for the Host, the word that says so. */
export interface ListedMember extends ListedPerson {
  /** What the person is in this Popkin, beside the name: "Host". */
  role?: string | null;
}

/**
 * The members of the Popkin home (docs/design-system/components/list-row.html, `row row--short`):
 * each person's avatar and name, and "Host" beside the Host. Give it up to six members, the Host
 * first; the fifth and sixth show from 1024 px (L2-058 AC11).
 */
@Component({
  selector: 'ul[pk-member-list]',
  imports: [Avatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './member-list.html',
  styleUrl: './member-list.scss',
  host: { class: 'member-list' },
})
export class MemberList {
  readonly members = input.required<readonly ListedMember[]>();
}
