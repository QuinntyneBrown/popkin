import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Avatar } from '../avatar/avatar';
import { LinkKey } from '../link-key/link-key';

/** Someone a contact is connected to, as the row shows them. */
export interface AroundItem {
  name: string;
  initials?: string;
  photo?: string | null;
  /** The `data-accent` of their colour. */
  accent: string;
  /** The line's kind, keyed before the face on Connections' panel; none on a profile. */
  kind?: 'family' | 'partner' | 'friend' | 'work' | null;
  /** How they know each other: "Married", "Brother". */
  meta: string;
  link: string | readonly unknown[];
}

/**
 * People around (docs/design-system/components/list-row.html, `divided` short rows): the people a
 * contact is connected to, each a link with their face, name and how they know each other; on
 * Connections' panel, the line's key leads each row (L2-149 AC3, L2-150 AC4).
 */
@Component({
  selector: 'ul[pk-people-around]',
  imports: [Avatar, LinkKey, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './people-around.html',
  styleUrl: './people-around.scss',
  host: { class: 'divided' },
})
export class PeopleAround {
  readonly people = input.required<readonly AroundItem[]>();
}
