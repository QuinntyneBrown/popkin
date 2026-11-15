import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';
import { Link } from '../link/link';
import { NgTemplateOutlet } from '@angular/common';

/**
 * List head (docs/design-system/components/contacts-layout.html, `list-head`): a list's heading
 * with its link, "Coming up · All dates". The title is a real heading (`h2` on the page, `h3`
 * inside a column) whose id the section around it is labelled by; the count is part of its text
 * ("Overdue 1"). `late` is in coral; `quiet` is the small subtle heading, with an icon, of a
 * strip such as Closest. The link names its destination ("All dates", not "See all"). 44 px
 * tall.
 */
@Component({
  selector: 'div[pk-list-head]',
  imports: [Icon, Link, NgTemplateOutlet, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './list-head.html',
  styleUrl: './list-head.scss',
  host: { class: 'list-head' },
})
export class ListHead {
  /** The heading's id, for the section's `aria-labelledby`. */
  readonly headingId = input.required<string>();
  readonly heading = input.required<string>();
  readonly count = input<number | string>();
  readonly level = input<2 | 3>(2);
  readonly tone = input<'default' | 'late' | 'quiet'>('default');
  readonly icon = input<IconName>();
  /** Where the link leads, and its words: "All dates". */
  readonly link = input<string | readonly unknown[]>();
  readonly linkLabel = input<string>();
}
