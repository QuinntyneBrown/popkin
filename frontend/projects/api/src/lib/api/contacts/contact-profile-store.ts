import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { ContactProfileView } from '../../models/contacts';
import { toApiProblem } from '../problem';
import { CONTACTS_API } from './contacts-api';
import { isContactId } from './contacts-text';

export type ContactProfileState = 'loading' | 'ready' | 'failed' | 'notFound';

/**
 * A contact's profile (docs/detailed-designs/contacts/contact-profile): one per screen; the page
 * provides it. A contact that is not mine, or an address that cannot name one, is `notFound`
 * and says nothing of who was asked for (L2-122 AC2).
 */
@Injectable()
export class ContactProfileStore {
  private readonly api = inject(CONTACTS_API);
  private contactId = '';

  readonly state = signal<ContactProfileState>('loading');
  readonly profile = signal<ContactProfileView | null>(null);
  /** The first name the opening screen showed, for the loading and failed lines (gap 111). */
  readonly knownFirstName = signal<string | null>(null);
  /** A change from the menu is on its way. */
  readonly busy = signal(false);

  open(contactId: string, knownFirstName: string | null = null): void {
    this.contactId = contactId;
    this.knownFirstName.set(knownFirstName);
    this.profile.set(null);
    this.load();
  }

  /** "Try again" after a failed load (L2-123 AC3). */
  retry(): void {
    this.load();
  }

  /** Into Closest (L2-131 AC4), then the profile is read again. */
  addToClosest(): void {
    this.change(this.api.addToClosest(this.contactId));
  }

  /** Out of Closest (L2-131 AC2), then the profile is read again. */
  takeOutOfClosest(): void {
    this.change(this.api.takeOutOfClosest(this.contactId));
  }

  private change(sent: Observable<void>): void {
    if (this.busy()) return;
    this.busy.set(true);
    sent.subscribe({
      next: () => {
        this.busy.set(false);
        this.load(true);
      },
      error: () => this.busy.set(false),
    });
  }

  private load(quietly = false): void {
    if (!isContactId(this.contactId)) {
      this.state.set('notFound');
      return;
    }
    if (!quietly) this.state.set('loading');
    this.api.contact(this.contactId).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.state.set('ready');
      },
      error: (error: unknown) => {
        if (quietly && this.profile()) return;
        this.state.set(toApiProblem(error).code === 'contact_not_found' ? 'notFound' : 'failed');
      },
    });
  }
}
