import { ChangeDetectionStrategy, Component, input } from '@angular/core';

let next = 0;

/**
 * Contacts start (docs/mocks/pages/contacts-today/empty.html): what Today shows with nobody in
 * Contacts (L2-125 AC8). Its heading names the section; the actions (`[slot=action]`, `a` or
 * `button[pk-button]`s) sit side by side, and an optional note (`[slot=note]`) follows them.
 */
@Component({
  selector: 'section[pk-contacts-start]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contacts-start.html',
  styleUrl: './contacts-start.scss',
  host: { class: 'contacts-start', '[attr.aria-labelledby]': 'headingId' },
})
export class ContactsStart {
  readonly heading = input.required<string>();
  readonly lead = input.required<string>();

  protected readonly headingId = `pk-contacts-start-${next++}`;
}
