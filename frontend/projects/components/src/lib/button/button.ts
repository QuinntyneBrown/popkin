import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Button (docs/design-system/components/button.html). On `<button>` it takes an action, on `<a>`
 * it goes somewhere. While `busy` it is disabled, says what is happening and cannot send twice
 * (L2-056 AC3).
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
    '[attr.disabled]': 'busy() || disabled() ? "" : null',
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
}
