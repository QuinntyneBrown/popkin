import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * What a setting list says when it holds nothing (docs/design-system/components/setting-list.html):
 * "No one’s muted. You hear about everyone in your Popkins."
 */
@Component({
  selector: 'p[pk-setting-list-empty]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './setting-list-empty.html',
  styleUrl: './setting-list-empty.scss',
  host: { class: 'setting-list__empty' },
})
export class SettingListEmpty {}
