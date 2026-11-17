import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { Switch } from '../switch/switch';

let sections = 0;

/**
 * Settings section (docs/design-system/components/setting-list.html, `settings-section`): a titled
 * part of a settings page, with a sentence under its title and, at its end, one switch with its
 * visible word, as "Email" of "Email me about activity" (L2-156). The section is named by its
 * title. Set `data-accent` on an ancestor.
 */
@Component({
  selector: 'section[pk-settings-section]',
  imports: [Switch],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings-section.html',
  styleUrl: './settings-section.scss',
  host: { class: 'settings-section', '[attr.aria-labelledby]': 'id' },
})
export class SettingsSection {
  readonly heading = input.required<string>();
  /** The sentence under the title: "Reminders and sign-in codes always arrive on time." */
  readonly text = input<string>();
  /** The visible word beside the switch: "Email". No switch without it. */
  readonly toggle = input<string>();
  /** The switch's name: "Email notifications". */
  readonly toggleName = input<string>();
  readonly checked = model(false);
  readonly toggleDisabled = input(false);
  /** A section of a view, under the screen's own sections: its title one step smaller. */
  readonly small = input(false);

  protected readonly id = `pk-settings-section-${++sections}`;
}
