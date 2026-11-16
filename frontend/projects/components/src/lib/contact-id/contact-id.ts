import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';

/**
 * Contact header (docs/design-system/components/contact-id.html): the top of a contact's profile,
 * a region named by the person. Their avatar (`[slot=avatar]`, `pk-avatar` at `xl`), their name as
 * the page's heading, a line of who they are ("Brother · Family · Manchester") and, where the two
 * share one, a link to a Popkin. Then the actions: Message and Call open the phone's own apps on
 * `phone`; without a phone, Email opens the mail app on `email`; Log opens `logLink`. Under 1024 px the actions share the width under the name.
 */
@Component({
  selector: 'section[pk-contact-id]',
  imports: [Button, Icon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contact-id.html',
  styleUrl: './contact-id.scss',
  host: { class: 'contact-id', '[attr.aria-label]': 'name()' },
})
export class ContactId {
  readonly name = input.required<string>();
  readonly sub = input<string>();
  /** The name of a Popkin you are both in, and its route. */
  readonly popkin = input<string>();
  readonly popkinLink = input<string | readonly unknown[]>();
  /** The number Message and Call use. Without it they are left out. */
  readonly phone = input<string | null>(null);
  /** The address Email uses when there is no phone; with neither, only Log shows. */
  readonly email = input<string | null>(null);
  readonly logLink = input.required<string | readonly unknown[]>();
}
