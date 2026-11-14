import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Quote (docs/design-system/components/message.html, `bubble__quote`): the message a reply
 * answers, its sender's first name over one line of its text (L2-025 AC2). In a reply's bubble
 * it is a `button` that goes to the message (L2-025 AC3), named by its consumer; at the top of
 * the message actions it is a `div`, and there `truncate` is off so the whole line shows.
 *
 * A `deleted` quote reads "Message deleted", in italics, and is never a button (L2-025 AC4).
 */
@Component({
  selector: 'div[pk-quote], button[pk-quote]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './quote.html',
  styleUrl: './quote.scss',
  host: {
    class: 'bubble__quote',
    '[class.bubble__quote--deleted]': 'deleted()',
  },
})
export class Quote {
  /** The sender's first name, or "You". */
  readonly name = input('');
  /** One line of the message's text. */
  readonly snippet = input('');
  readonly deleted = input(false);
  /** Cuts the line at the quote's edge with an ellipsis, as in a bubble. */
  readonly truncate = input(true);
}
