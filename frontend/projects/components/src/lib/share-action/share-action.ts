import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/** One way to pass an invite on: an icon over a word ("Copy link", "Text it", "Share"). */
@Component({
  selector: 'button[pk-share-action], a[pk-share-action]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './share-action.html',
  styleUrl: './share-action.scss',
  host: { class: 'share-action' },
})
export class ShareAction {
  readonly icon = input.required<IconName>();
}
