import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Avatar } from '../avatar/avatar';

/** A member of an open group, as the row shows them. */
export interface GroupMemberItem {
  name: string;
  initials?: string;
  photo?: string | null;
  /** The `data-accent` of their colour. */
  accent: string;
  /** How you know them: their Known as, else their circle. */
  text?: string | null;
  /** When you last talked: "Thu", "Aug 13". */
  meta?: string | null;
  link: string | readonly unknown[];
}

/**
 * Group members (docs/design-system/components/list-row.html, `divided` rows): the people in an
 * open group, each a link to their profile with their face, name, how you know them and when you
 * last talked (L2-146 AC2, AC5).
 */
@Component({
  selector: 'ul[pk-group-members]',
  imports: [Avatar, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './group-members.html',
  styleUrl: './group-members.scss',
  host: { class: 'divided' },
})
export class GroupMembers {
  readonly members = input.required<readonly GroupMemberItem[]>();
}
