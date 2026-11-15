import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

let nextId = 0;

/**
 * Info card (docs/design-system/components/info-card.html, `info-card`): a sand card of facts.
 * With a `heading` it is a section named by it, such as a habit: a line over it ("Every 2
 * weeks"), the title, which links where `link` is given and reads in its own colour (underlined
 * on hover only), the default slot (a keep strip) and a foot, in coral when `late`. Without one
 * it is a plain card of `p[pk-info-line]` facts. Use `div[pk-info-card]` for a plain card.
 */
@Component({
  selector: 'section[pk-info-card], div[pk-info-card]',
  imports: [Icon, NgTemplateOutlet, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './info-card.html',
  styleUrl: './info-card.scss',
  host: {
    class: 'info-card',
    '[attr.aria-labelledby]': 'heading() ? headingId : null',
  },
})
export class InfoCard {
  /** Above the title, muted: "Every 2 weeks". */
  readonly over = input<string>();
  readonly overIcon = input<IconName>();
  readonly heading = input<string>();
  /** Where the title leads: the habit. */
  readonly link = input<string | readonly unknown[]>();
  /** The title's level in the page's outline. */
  readonly level = input<2 | 3>(3);
  /** Under the content: "Overdue since Sep 13". */
  readonly foot = input<string>();
  readonly late = input(false);

  protected readonly headingId = `info-card-${++nextId}-h`;
  protected readonly hasHead = computed(() => !!this.over() || !!this.heading());
}
