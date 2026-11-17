import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AvatarStack, StackAvatar } from '../avatar-stack/avatar-stack';
import { DateTile } from '../date-tile/date-tile';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';
import { Skeleton } from '../skeleton/skeleton';

/** One key date on Dates, as its row shows it. */
export interface DateListItem {
  /** The weekday over the day of the month: "Sat", "19". */
  top: string;
  day: string;
  /** 14 days away or fewer: the tile in the loud yellow (known gap 113, ruled). */
  soon?: boolean;
  avatars: readonly StackAvatar[];
  icon: IconName;
  /** "Grace’s birthday". */
  title: string;
  /** "Turns 33", "5 years married"; none without a first year. */
  line?: string;
  /** "in 4 days", "tomorrow", "today". */
  when: string;
  /** "1 week before"; shown from small screens up. */
  reminder: string;
  link: string | readonly unknown[];
}

/**
 * Date list (docs/design-system/components/spotlight.html, the rows of Dates): each key date a
 * link to the contact's profile, led by its date tile, with who, what, how soon and its
 * reminder. The tile and faces are decoration; the title and "in {n} days" say it in words.
 */
@Component({
  selector: 'ul[pk-date-list]',
  imports: [AvatarStack, DateTile, Icon, RouterLink, Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './date-list.html',
  styleUrl: './date-list.scss',
  host: { class: 'divided', '[attr.aria-hidden]': 'loading() || null' },
})
export class DateList {
  readonly dates = input.required<readonly DateListItem[]>();
  /** While Dates loads: skeleton rows, hidden from assistive technology (L2-123 AC1). */
  readonly loading = input(false);
  protected readonly skeletons = [1, 2, 3, 4, 5];
}
