import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Avatar } from '../avatar/avatar';

/** One of your closest people: their face and first name, linking to their profile. */
export interface ClosestPerson {
  firstName: string;
  photo?: string | null;
  initials?: string;
  /** The `data-accent` of their colour. */
  accent: string;
  link: string | readonly unknown[];
}

/**
 * Closest (docs/design-system/components/contact-row.html, `closest`): the starred people above
 * People as a strip of faces, each a link named by the first name under it; the face is hidden.
 * Each is 80 px wide. Below M the strip runs to the screen's edges and scrolls sideways.
 */
@Component({
  selector: 'div[pk-closest]',
  imports: [Avatar, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './closest.html',
  styleUrl: './closest.scss',
  host: { class: 'closest' },
})
export class Closest {
  readonly people = input.required<readonly ClosestPerson[]>();
}
