import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Avatar } from '../avatar/avatar';
import { Skeleton } from '../skeleton/skeleton';

/** A person in People, as their row shows them. */
export interface ContactRowItem {
  name: string;
  /** How you know them: "Former manager". */
  relation?: string;
  /** Their circle: "Work". */
  circle?: string;
  /**
   * Their next date: "Oct 7" and what it is, "Birthday". A near one reads date first, in bold
   * ("Oct 7 · Birthday"); a later one what first ("Birthday Apr 29").
   */
  next?: { date: string; what: string; near?: boolean };
  /** How long since you talked, in words: "Sun", "59 days ago". */
  lastTalked: string;
  /** More than 30 days: in coral and semibold; the words already say how long. */
  quiet?: boolean;
  photo?: string | null;
  initials?: string;
  /** The `data-accent` of their colour. */
  accent: string;
  link: string | readonly unknown[];
}

/**
 * Contact list (docs/design-system/components/contact-row.html, `contact-row`): the people in
 * People as a list of links, not a table: each row is one action, and its cells are read as one
 * link's name. Below M a row is who and when you last talked; from M the circle and next date
 * are columns too, under a header that is `aria-hidden`, so the last cell carries its own words
 * ("Last talked"). Each row is at least 72 px tall; the focus ring goes round the whole row.
 */
@Component({
  selector: 'div[pk-contact-list]',
  imports: [Avatar, RouterLink, Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contact-list.html',
  styleUrl: './contact-list.scss',
  host: { class: 'contact-list' },
})
export class ContactList {
  readonly people = input.required<readonly ContactRowItem[]>();
  /** The list's name: "Everyone", "Family". */
  readonly label = input.required<string>();
  /**
   * While People loads: skeleton circles and rows in place of the list, hidden from assistive
   * technology; the page says it is loading in a status line (L2-123 AC1).
   */
  readonly loading = input(false);
  protected readonly skeletons = [1, 2, 3, 4, 5, 6, 7];
}
