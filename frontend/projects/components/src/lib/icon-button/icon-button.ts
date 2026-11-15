import { ChangeDetectionStrategy, Component, ElementRef, inject, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/**
 * Icon button (docs/design-system/components/icon-button.html): a 44 px round target whose
 * accessible name is its label, shown as a tooltip too. With `text` it is labelled
 * (`icon-btn--labelled`): from 640 px a short word shows beside the icon, as Invite does on a
 * call. The word is for the eye; the name stays the `label`, which begins with it.
 */
@Component({
  selector: 'a[pk-icon-button], button[pk-icon-button]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './icon-button.html',
  styleUrl: './icon-button.scss',
  host: {
    class: 'icon-btn',
    '[class.icon-btn--card]': "variant() === 'card'",
    '[class.icon-btn--send]': "variant() === 'send'",
    '[class.icon-btn--popkin]': "variant() === 'popkin'",
    '[class.icon-btn--chip]': "variant() === 'chip'",
    '[class.icon-btn--labelled]': '!!text()',
    '[attr.aria-label]': 'label()',
    '[attr.title]': 'disabledReason() ?? label()',
    '[attr.aria-disabled]': 'disabledReason() ? "true" : null',
  },
})
export class IconButton {
  readonly icon = input.required<IconName>();
  readonly label = input.required<string>();
  /**
   * `card` is a button on a tinted surface, such as the home header: a white disc with a shadow.
   * `send` is the coral button that sends a message. `popkin` draws the icon in the Popkin's
   * colour: "Start group call". `chip` is the 32 px quiet button inside a chip: "Remove
   * Lakeside Weekend".
   */
  readonly variant = input<'plain' | 'card' | 'send' | 'popkin' | 'chip'>('plain');
  readonly size = input<'sm' | 'md' | 'lg' | 'base'>('base');
  /** The word shown beside the icon from 640 px: "Invite". */
  readonly text = input<string>();
  /**
   * Why the action is switched off for this person (L2-086 AC2): `aria-disabled`, the reason as
   * its tooltip, still focusable, and a click is stopped before its consumer hears it.
   */
  readonly disabledReason = input<string | null>(null);

  constructor() {
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.addEventListener(
      'click',
      (event: MouseEvent) => {
        if (!this.disabledReason()) return;
        event.preventDefault();
        event.stopImmediatePropagation();
      },
      { capture: true },
    );
  }
}
