import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/**
 * Info line (docs/design-system/components/info-card.html, `info-card__line`): one fact on an
 * info card, its icon hidden beside the words, which are the default slot.
 */
@Component({
  selector: 'p[pk-info-line]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './info-line.html',
  styleUrl: './info-line.scss',
  host: { class: 'info-card__line' },
})
export class InfoLine {
  readonly icon = input.required<IconName>();
}
