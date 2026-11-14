import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/**
 * Stage button (docs/design-system/components/photo-viewer.html, `stage-btn`): a 48 px round
 * button on a veil of the dark stage, beside the react bar: "Comment". Its accessible name is its
 * label, shown as a tooltip too.
 */
@Component({
  selector: 'a[pk-stage-button], button[pk-stage-button]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stage-button.html',
  styleUrl: './stage-button.scss',
  host: { class: 'stage-btn', '[attr.aria-label]': 'label()', '[attr.title]': 'label()' },
})
export class StageButton {
  readonly icon = input.required<IconName>();
  readonly label = input.required<string>();
}
