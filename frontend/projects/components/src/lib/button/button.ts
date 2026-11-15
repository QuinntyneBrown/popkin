import { ChangeDetectionStrategy, Component, ElementRef, inject, input } from '@angular/core';

/**
 * Button (docs/design-system/components/button.html). On `<button>` it takes an action, on `<a>`
 * it goes somewhere. While `busy` it is disabled, says what is happening and cannot send twice
 * (L2-056 AC3). With `pressed` set it is a toggle: `aria-pressed` says whether it is on, and
 * its label should say so too ("I’m keen", "You’re keen").
 */
@Component({
  selector: 'a[pk-button], button[pk-button]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './button.html',
  styleUrl: './button.scss',
  host: {
    class: 'btn',
    '[class.btn--primary]': "variant() === 'primary'",
    '[class.btn--popkin]': "variant() === 'popkin'",
    '[class.btn--secondary]': "variant() === 'secondary'",
    '[class.btn--quiet]': "variant() === 'quiet'",
    '[class.btn--danger]': "variant() === 'danger'",
    '[class.btn--on-accent]': "variant() === 'on-accent'",
    '[class.btn--md]': "size() === 'md'",
    '[class.btn--sm]': "size() === 'sm'",
    '[class.btn--block]': 'block()',
    '[attr.aria-busy]': "busy() ? 'true' : null",
    '[attr.aria-pressed]': 'pressed() === null ? null : pressed()',
    '[attr.disabled]': 'busy() || disabled() ? "" : null',
    '[attr.aria-disabled]': 'disabledReason() ? "true" : null',
    '[attr.title]': 'disabledReason() ?? title()',
  },
})
export class Button {
  /** `on-accent` is the white button on a picture or on the dark stage, in both themes. */
  readonly variant = input<
    'primary' | 'popkin' | 'secondary' | 'quiet' | 'danger' | 'on-accent' | 'ghost'
  >('ghost');
  readonly size = input<'lg' | 'md' | 'sm'>('lg');
  readonly block = input(false);
  readonly busy = input(false);
  readonly disabled = input(false);
  /** A toggle's state; null for a button that is not one. */
  readonly pressed = input<boolean | null>(null);
  /**
   * Why the action is switched off for this person, such as "Viewer admins can’t do this"
   * (L2-086 AC2, AC3): the button is `aria-disabled`, ignores activation and stays focusable, so
   * a keyboard or screen-reader user reaches the reason, its tooltip and its description.
   */
  readonly disabledReason = input<string | null>(null);
  /** The tooltip of a button that shows its icon only on a narrow screen, such as "Contacts". */
  readonly title = input<string | null>(null);

  constructor() {
    // A capture listener on the button runs before its consumer's (click), so it can stop it.
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
