import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Link (docs/design-system/components/link.html). `text` is the text button under a primary
 * action ("Use a different number"); on `<button>` it takes an action ("Send a new code").
 * `accent` names the action in the accent colour. With `action`, a muted question leads into the
 * words of the action, which alone take the accent colour: "New here? Start a Popkin".
 */
@Component({
  selector: 'a[pk-link], button[pk-link]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './link.html',
  styleUrl: './link.scss',
  host: {
    '[class.text-btn]': "variant() !== 'inline'",
    '[class.text-btn--accent]': "variant() === 'accent'",
  },
})
export class Link {
  readonly variant = input<'inline' | 'text' | 'accent'>('inline');
  /** The words of the action, in the accent colour after the content: "Start a Popkin". */
  readonly action = input<string>();
}
