import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Avatar, PersonAvatar } from '../avatar/avatar';

/** One entry in Today's "Recently". */
export interface RecentItem {
  face: PersonAvatar;
  /** The dot's colour: coral for a conversation, amber for a milestone. */
  kind: 'conversation' | 'milestone';
  /** "Ada · Phone". */
  title: string;
  note?: string;
  /** "Sun", "Sep 7". */
  when: string;
  link: string | readonly unknown[];
}

/**
 * Today's Recently (docs/design-system/components/list-row.html, the short row): the latest
 * entries, each linking to the profile with the face, a dot for its kind, its title, its note
 * and when (L2-125 AC6). The title says what the dot shows.
 */
@Component({
  selector: 'ul[pk-recent-list]',
  imports: [Avatar, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recent-list.html',
  styleUrl: './recent-list.scss',
  host: { class: 'recent-list' },
})
export class RecentList {
  readonly entries = input.required<readonly RecentItem[]>();
}
