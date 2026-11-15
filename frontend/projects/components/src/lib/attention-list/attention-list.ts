import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../icon/icon';

/** One thing that needs an admin now, and where it is dealt with. */
export interface AttentionItem {
  /** "5 reports to review". */
  title: string;
  /** One line, cut short where it does not fit: "Oldest 18 min ago · harassment in …". */
  detail?: string;
  urgent?: boolean;
  link: string | readonly unknown[];
}

/**
 * Attention list (docs/design-system/components/activity-lists.html, `attention`): what needs
 * an admin now, five to ten items in a panel. Each item is one full-width link, at least 56 px
 * tall: a dot, its title, its detail and a chevron. An urgent item has the danger dot and says
 * "(urgent)" in visually hidden text, so the dot is not the only sign.
 */
@Component({
  selector: 'ul[pk-attention-list]',
  imports: [Icon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './attention-list.html',
  styleUrl: './attention-list.scss',
  host: { class: 'attention' },
})
export class AttentionList {
  readonly items = input.required<readonly AttentionItem[]>();
}
