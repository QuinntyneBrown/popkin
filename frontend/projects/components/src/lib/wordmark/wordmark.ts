import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The wordmark alone (docs/design-system/components/logo.html), where the screen is about
 * something else and the brand only signs it, as on an invite.
 */
@Component({
  selector: 'span[pk-wordmark]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './wordmark.html',
  styleUrl: './wordmark.scss',
  host: {
    class: 'wordmark',
    '[class.wordmark--lg]': "size() === 'lg'",
    '[class.wordmark--coral]': "tone() === 'coral'",
    role: 'img',
    'aria-label': 'popkin',
  },
})
export class Wordmark {
  readonly tone = input<'ink' | 'coral'>('ink');
  /** `lg` signs a screen of its own: the welcome screen. */
  readonly size = input<'base' | 'lg'>('base');
}
