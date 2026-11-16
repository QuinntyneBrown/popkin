import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Contacts grid (docs/design-system/components/contacts-layout.html, `contacts-grid`): two
 * columns from L, one above the other below it: `lead` and side (Today), `about` and history (a
 * profile), main and `aside` (Dates, Connections). Its two children are the default slot, in
 * reading order: the first column comes first, so focus never jumps back up the page.
 */
@Component({
  selector: 'div[pk-contacts-grid]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contacts-grid.html',
  styleUrl: './contacts-grid.scss',
  host: {
    class: 'contacts-grid',
    '[class.contacts-grid--lead]': "layout() === 'lead'",
    '[class.contacts-grid--about]': "layout() === 'about'",
    '[class.contacts-grid--aside]': "layout() === 'aside'",
    '[class.contacts-grid--narrow]': "layout() === 'narrow'",
  },
})
export class ContactsGrid {
  readonly layout = input.required<'lead' | 'about' | 'aside' | 'narrow'>();
}
