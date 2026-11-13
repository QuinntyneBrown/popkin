import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';
import { IconButton } from '../icon-button/icon-button';

export type BannerVariant = 'info' | 'success' | 'warning' | 'danger' | 'popkin';

/** The icon the mocks draw for each variant (docs/mocks/notifications/banner). */
const ICONS: Record<BannerVariant, IconName> = {
  info: 'alert',
  success: 'wifi',
  warning: 'clock',
  danger: 'wifi-off',
  popkin: 'video',
};

/**
 * Banner (docs/design-system/components/banner.html): a full-width strip under the header for a
 * condition that lasts, such as being offline. `danger` is an alert, because it changes what
 * works; the others are a status. Its one action is projected into the default slot.
 */
@Component({
  selector: 'div[pk-banner]',
  imports: [Icon, IconButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './banner.html',
  styleUrl: './banner.scss',
  host: {
    class: 'banner',
    '[class.banner--popkin]': "variant() === 'popkin'",
    '[class.banner--success]': "variant() === 'success'",
    '[class.banner--warning]': "variant() === 'warning'",
    '[class.banner--danger]': "variant() === 'danger'",
    '[attr.role]': "variant() === 'danger' ? 'alert' : 'status'",
  },
})
export class Banner {
  readonly variant = input<BannerVariant>('info');
  /** The condition, in bold. */
  readonly heading = input.required<string>();
  /** What it means, after the heading. */
  readonly text = input<string>();
  /** Another icon than the variant's own. */
  readonly icon = input<IconName>();
  /** Shows the Dismiss button. */
  readonly dismissible = input(false);
  readonly dismissed = output<void>();

  protected readonly shownIcon = computed(() => this.icon() ?? ICONS[this.variant()]);
}
