import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';
import { Switch } from '../switch/switch';

let rows = 0;

/**
 * Setting row (docs/design-system/components/switch.html, `setting-row`): a switch with its
 * words, on a surface: an icon, what the setting is (`heading`, the switch's name) and what it
 * does as it stands (`text`, the switch's description, which changes with it). "Keep the photo
 * album" on the wrap-up screen. Set `data-accent` on an ancestor.
 */
@Component({
  selector: 'div[pk-setting-row]',
  imports: [Icon, Switch],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './setting-row.html',
  styleUrl: './setting-row.scss',
  host: { class: 'setting-row' },
})
export class SettingRow {
  readonly icon = input.required<IconName>();
  /** What the setting is: "Keep the photo album". */
  readonly heading = input.required<string>();
  /** What it does as it stands: "Members can keep browsing and saving". */
  readonly text = input<string>();
  readonly checked = model(false);
  /** The form is being sent: the switch cannot be turned. */
  readonly disabled = input(false);

  protected readonly id = `pk-setting-${++rows}`;
}
