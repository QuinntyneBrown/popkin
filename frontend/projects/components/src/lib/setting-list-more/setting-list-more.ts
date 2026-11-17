import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * What follows a setting list that shows only its first rows
 * (docs/design-system/components/setting-list.html): "Show all 7 contacts with birthdays", a text
 * button in the accent colour (`pk-link`).
 */
@Component({
  selector: 'div[pk-setting-list-more]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './setting-list-more.html',
  styleUrl: './setting-list-more.scss',
  host: { class: 'setting-list__more' },
})
export class SettingListMore {}
