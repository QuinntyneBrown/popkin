import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Setting list (docs/design-system/components/setting-list.html): a ruled list of things a member
 * sets one by one, such as each Popkin's level. Its rows are `pk-setting-list-item`. It is not the
 * settings list (`pk-settings-list`), which shows read-only keys and values.
 */
@Component({
  selector: 'ul[pk-setting-list]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './setting-list.html',
  styleUrl: './setting-list.scss',
  host: { class: 'setting-list' },
})
export class SettingList {}
