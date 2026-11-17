import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

/**
 * Switch (docs/design-system/components/switch.html): one setting that is on or off and takes
 * effect as the form it sits in is sent. A press, Space or Enter turns it. It has no words of
 * its own: name it with `aria-labelledby` and describe what the setting does with
 * `aria-describedby`, or use `pk-setting-row`, which does both. On is the Popkin's colour and
 * the thumb at the end, so colour is not the only carrier. Set `data-accent` on an ancestor.
 */
@Component({
  selector: 'button[pk-switch]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './switch.html',
  styleUrl: './switch.scss',
  host: {
    class: 'switch',
    type: 'button',
    role: 'switch',
    '[attr.aria-checked]': 'checked()',
    '[attr.aria-disabled]': 'disabledReason() ? "true" : null',
    '[attr.title]': 'disabledReason()',
    '(click)': 'turn()',
  },
})
export class Switch {
  readonly checked = model(false);
  /**
   * Why the switch is off-limits for this person (L2-086 AC2, AC3): it is `aria-disabled` with
   * the reason as its title, stays focusable and ignores a press.
   */
  readonly disabledReason = input<string | null>(null);

  protected turn(): void {
    if (this.disabledReason()) return;
    this.checked.set(!this.checked());
  }
}
