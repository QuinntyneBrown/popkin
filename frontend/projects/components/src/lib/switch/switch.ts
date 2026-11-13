import { ChangeDetectionStrategy, Component, model } from '@angular/core';

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
    '(click)': 'checked.set(!checked())',
  },
})
export class Switch {
  readonly checked = model(false);
}
