import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';
import { IconButton } from '../icon-button/icon-button';

export type BannerVariant = 'info' | 'success' | 'warning' | 'danger' | 'popkin' | 'loud';

/** The icon the mocks draw for each variant (docs/mocks/notifications/banner). */
const ICONS: Record<BannerVariant, IconName> = {
  info: 'alert',
  success: 'wifi',
  warning: 'clock',
  danger: 'wifi-off',
  popkin: 'video',
  loud: 'alert',
};

/**
 * Banner (docs/design-system/components/banner.html): a full-width strip under the header for a
 * condition that lasts, such as being offline. `danger` is an alert, because it changes what
 * works; the others are a status. Its one action is `action`, the white pill at its end: "Join"
 * on the banner of a call (`popkin`). With `actionLink` it is a link; without, a button, and
 * `acted` says it was chosen. `loud` is an announcement of an outage, in the loud yellow.
 */
@Component({
  selector: 'div[pk-banner]',
  imports: [Icon, IconButton, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './banner.html',
  styleUrl: './banner.scss',
  host: {
    class: 'banner',
    '[class.banner--popkin]': "variant() === 'popkin'",
    '[class.banner--success]': "variant() === 'success'",
    '[class.banner--warning]': "variant() === 'warning'",
    '[class.banner--danger]': "variant() === 'danger'",
    '[class.banner--loud]': "variant() === 'loud'",
    '[attr.role]': "variant() === 'danger' ? 'alert' : 'status'",
  },
})
export class Banner {
  readonly variant = input<BannerVariant>('info');
  /** The condition, in bold. An announcement has none: its words are all `text`. */
  readonly heading = input<string>();
  /** What it means, after the heading. */
  readonly text = input<string>();
  /** Another icon than the variant's own. */
  readonly icon = input<IconName>();
  /** The words of the one action: "Join". None without it. */
  readonly action = input<string>();
  /** The action's accessible name where its words say less: "Change how long it lasts". */
  readonly actionLabel = input<string>();
  /** The route the action leads to. Without it the action is a button. */
  readonly actionLink = input<string | readonly unknown[]>();
  /** The action was chosen, where it is a button. */
  readonly acted = output<void>();
  /** Shows the Dismiss button. */
  readonly dismissible = input(false);
  readonly dismissed = output<void>();
  /**
   * Draws the dismiss cross as a picture, not a button, where the banner is only a picture: the
   * announcement preview beside its form.
   */
  readonly dismissMark = input(false);

  protected readonly shownIcon = computed(() => this.icon() ?? ICONS[this.variant()]);
}
