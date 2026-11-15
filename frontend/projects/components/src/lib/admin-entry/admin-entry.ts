import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AdminBrand } from '../admin-brand/admin-brand';

/**
 * Admin entry (docs/design-system/components/admin-entry.html): the console's screens before
 * sign-in, a card under the brand on the sand page. With a `heading` it draws the title and the
 * lead, whose `leadEmphasis` (an address) is set in bold between `lead` and `leadEnd`; the
 * content follows, then the links (`[slot=links]`) along one line. Without a heading the content
 * fills the card, as an empty state does. The foot says every action is recorded.
 */
@Component({
  selector: 'main[pk-admin-entry]',
  imports: [AdminBrand],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-entry.html',
  styleUrl: './admin-entry.scss',
  host: { class: 'admin-entry', id: 'main', tabindex: '-1' },
})
export class AdminEntry {
  readonly heading = input<string>();
  readonly lead = input<string>();
  readonly leadEmphasis = input<string>();
  readonly leadEnd = input<string>();
  /** Whether the card has links under its content: "Use another email". */
  readonly links = input(false);
}
