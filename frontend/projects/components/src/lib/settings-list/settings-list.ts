import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** One configuration value the deployment runs with. */
export interface SettingEntry {
  /** What it is, in words: "Code hash key". */
  name: string;
  /** Its configuration key, supplementary: "Auth:CodeHashKey". */
  key: string;
  /** The value; absent when it is not set. Never given for a secret. */
  value?: string;
  /** A secret shows only whether it is set. */
  secret?: boolean;
  /** For a secret: whether it is set. */
  set?: boolean;
}

/**
 * Settings list (docs/design-system/components/settings-list.html, `config`): one group of the
 * read-only configuration, a description list headed by the group's name, which the consumer
 * writes above it. A secret shows "Set" or "Not set" and says "(secret, value hidden)" in
 * visually hidden text; a value that is not set reads "Not set", subtle. Under 640 px the value
 * goes below its name. Nothing in it can be pressed.
 */
@Component({
  selector: 'dl[pk-settings-list]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings-list.html',
  styleUrl: './settings-list.scss',
  host: { class: 'config' },
})
export class SettingsList {
  readonly entries = input.required<readonly SettingEntry[]>();
}
