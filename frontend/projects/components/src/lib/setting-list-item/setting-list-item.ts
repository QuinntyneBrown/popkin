import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * One row of a setting list (docs/design-system/components/setting-list.html): its lead (a
 * Popkin tile or an avatar, `slot="lead"`), its name and the line that says what is set now, and
 * the control at its end (the default slot). `stack` puts the control under the name below
 * 640 px, as a level picker needs; `display` sets the name in the display face.
 */
@Component({
  selector: 'li[pk-setting-list-item]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './setting-list-item.html',
  styleUrl: './setting-list-item.scss',
  host: { class: 'setting-list__item', '[class.setting-list__item--stack]': 'stack()' },
})
export class SettingListItem {
  readonly name = input.required<string>();
  readonly sub = input<string>();
  readonly stack = input(false);
  readonly display = input(false);
}
