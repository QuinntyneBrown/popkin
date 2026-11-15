import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Contacts page (docs/design-system/components/contacts-layout.html, `contacts-page`): the body
 * of every Contacts section inside the Popkin shell, its margins wider as the screen widens and
 * room for the tabs on a phone. Put it in a `pk-app-screen` whose body is `fill`. Its head (the
 * page head) is `[slot=head]`; the rest, usually a `pk-contacts-grid`, is the default slot.
 */
@Component({
  selector: 'div[pk-contacts-page]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contacts-page.html',
  styleUrl: './contacts-page.scss',
  host: { class: 'contacts-page' },
})
export class ContactsPage {}
